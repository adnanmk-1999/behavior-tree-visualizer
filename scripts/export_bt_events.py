#!/usr/bin/env python3
"""Export recorded Behavior Tree transitions without a ROS installation."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections.abc import Iterable, Iterator
from pathlib import Path

TOPIC = "/behavior_tree_log"


class ExportError(Exception):
    """An input, decoding or output error suitable for the command line."""


def normalize_uid(value: int | str) -> str:
    """Use decimal strings for both XML UIDs and decoded ROS integers."""
    if type(value) is int and value >= 0:
        return str(value)
    if isinstance(value, str):
        value = value.strip()
        if value.isascii() and value.isdecimal():
            return str(int(value))
    raise ValueError(f"Expected an unsigned integer UID, got {value!r}.")


def collect_xml_uids(path: Path) -> set[str]:
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError) as error:
        raise ExportError(f"Cannot read XML {path}: {error}") from error
    if root.tag != "root" or root.get("BTCPP_format") != "4":
        raise ExportError('Expected BehaviorTree.CPP XML with <root BTCPP_format="4">.')
    definitions = root.findall("BehaviorTree")
    if not definitions:
        raise ExportError(f"No BehaviorTree definitions in {path}.")

    uids: set[str] = set()

    def visit(node: ET.Element) -> None:
        if node.tag == "TreeNodesModel":
            return
        if "_uid" in node.attrib:
            try:
                uids.add(normalize_uid(node.attrib["_uid"]))
            except ValueError as error:
                raise ExportError(f"Invalid _uid on XML node <{node.tag}>: {error}") from error
        if node.tag != "SubTree":
            for child in node:
                visit(child)

    for definition in definitions:
        for child in definition:
            visit(child)
    return uids


def read_messages(bag: Path) -> Iterator[object]:
    try:
        from mcap.reader import make_reader
        from mcap_ros2.decoder import DecoderFactory
    except ImportError as error:
        raise ExportError(
            "MCAP dependencies are missing. Install with: "
            "python -m pip install -r scripts/requirements.txt"
        ) from error

    try:
        with bag.open("rb") as stream:
            reader = make_reader(stream, validate_crcs=True, decoder_factories=[DecoderFactory()])
            # Reception time must not reorder equal-timestamp events from different messages.
            for schema, _, _, message in reader.iter_decoded_messages(
                topics=[TOPIC], log_time_order=False,
            ):
                if schema is None or schema.name not in {
                    "nav2_msgs/msg/BehaviorTreeLog", "nav2_msgs/BehaviorTreeLog",
                }:
                    name = schema.name if schema else "(missing schema)"
                    raise ExportError(f"Unexpected message type on {TOPIC}: {name}.")
                yield message
    except ExportError:
        raise
    except Exception as error:
        # Decoder and compression failures have library-specific exception types.
        raise ExportError(
            f"Cannot read/decode MCAP {bag}: {type(error).__name__}: {error}"
        ) from error


def event_record(event: object) -> dict:
    seconds = event.timestamp.sec
    nanoseconds = event.timestamp.nanosec
    if type(seconds) is not int or type(nanoseconds) is not int:
        raise ValueError("Event timestamp sec and nanosec must be integers.")
    if not 0 <= nanoseconds < 1_000_000_000:
        raise ValueError("Event timestamp nanosec must be in [0, 1000000000).")
    for field in ("node_name", "previous_status", "current_status"):
        if not isinstance(getattr(event, field), str):
            raise ValueError(f"Event {field} must be a string.")
    if not event.previous_status or not event.current_status:
        raise ValueError("Event statuses must not be empty.")
    return {
        "timestampNs": str(seconds * 1_000_000_000 + nanoseconds),
        "uid": normalize_uid(event.uid),
        "nodeName": event.node_name,
        "previousStatus": event.previous_status,
        "currentStatus": event.current_status,
    }


def build_dataset(messages: Iterable[object], xml_uids: set[str]) -> dict:
    events = []
    message_count = 0
    for message_count, message in enumerate(messages, start=1):
        event_log = getattr(message, "event_log", None)
        if not isinstance(event_log, (list, tuple)):
            raise ExportError(f"Message {message_count} on {TOPIC} has no event_log array.")
        for event_index, event in enumerate(event_log):
            try:
                events.append(event_record(event))
            except (AttributeError, TypeError, ValueError) as error:
                raise ExportError(
                    f"Invalid message {message_count}, event_log[{event_index}]: {error}"
                ) from error

    if message_count == 0:
        raise ExportError(f"No messages on {TOPIC}; the topic is missing or empty.")

    # Python's stable sort retains MCAP file order and array order for equal event times.
    events.sort(key=lambda event: int(event["timestampNs"]))
    start = int(events[0]["timestampNs"]) if events else None
    for index, event in enumerate(events):
        event["index"] = index
        event["offsetMs"] = (int(event["timestampNs"]) - start) / 1_000_000

    unique_uids = {event["uid"] for event in events}
    unmatched = unique_uids - xml_uids
    return {
        "version": 1,
        "sourceTopic": TOPIC,
        "startTimestampNs": str(start) if start is not None else None,
        "durationMs": events[-1]["offsetMs"] if events else 0.0,
        "messageCount": message_count,
        "uniqueUidCount": len(unique_uids),
        "unmatchedUids": sorted(unmatched, key=int),
        "unmatchedEventCount": sum(event["uid"] in unmatched for event in events),
        "events": events,
    }


def write_dataset(dataset: dict, output: Path) -> None:
    temporary = None
    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        # A failed write must leave any previous successful export intact.
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n", dir=output.parent,
            prefix=f".{output.name}.", suffix=".tmp", delete=False,
        ) as stream:
            temporary = Path(stream.name)
            json.dump(dataset, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
        temporary.replace(output)
    except (OSError, ValueError) as error:
        raise ExportError(f"Cannot write output {output}: {error}") from error
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def export_events(bag: Path, xml: Path, output: Path) -> dict:
    for label, path in (("recording", bag), ("XML", xml)):
        if not path.is_file():
            raise ExportError(f"Missing {label} file: {path}")
        if output.resolve() == path.resolve() or (output.exists() and output.samefile(path)):
            raise ExportError(f"Output must not overwrite the {label} input: {path}")
    dataset = build_dataset(read_messages(bag), collect_xml_uids(xml))
    write_dataset(dataset, output)
    return dataset


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bag", required=True, type=Path, help="Input ROS 2 .mcap file")
    parser.add_argument("--xml", required=True, type=Path, help="Associated BehaviorTree.CPP v4 XML")
    parser.add_argument("--output", required=True, type=Path, help="Destination JSON file")
    args = parser.parse_args(argv)
    try:
        dataset = export_events(args.bag, args.xml, args.output)
    except (ExportError, OSError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(
        f"Exported {dataset['messageCount']} messages, {len(dataset['events'])} transitions, "
        f"{dataset['uniqueUidCount']} unique UIDs; duration {dataset['durationMs']:.6f} ms."
    )
    print(
        f"UID validation: {len(dataset['unmatchedUids'])} unmatched UIDs "
        f"({dataset['unmatchedEventCount']} events)."
    )
    if dataset["unmatchedUids"]:
        print(
            "Warning: unmatched UIDs retained in output: " + ", ".join(dataset["unmatchedUids"]),
            file=sys.stderr,
        )
    if not dataset["events"]:
        print("No status transitions were recorded; exported an empty event array.")
    print(f"Output: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from mcap.writer import CompressionType, Writer as RawWriter
from mcap_ros2.writer import Writer

from scripts.export_bt_events import (
    ExportError,
    TOPIC,
    build_dataset,
    collect_xml_uids,
    export_events,
    main,
    normalize_uid,
    write_dataset,
)

# Small, temporary fixtures use the same field types as the inspected recording.
SCHEMA = """builtin_interfaces/Time timestamp
BehaviorTreeStatusChange[] event_log
================================================================================
MSG: builtin_interfaces/Time
int32 sec
uint32 nanosec
================================================================================
MSG: nav2_msgs/BehaviorTreeStatusChange
builtin_interfaces/Time timestamp
string node_name
uint16 uid
string previous_status
string current_status
"""

XML = """<root BTCPP_format="4">
  <BehaviorTree ID="RobotTree" _uid="900">
    <Sequence _uid="01" name="Repeated">
      <Script _uid="2" name="Repeated" />
      <SubTree ID="Child" _uid="3" />
      <TreeNodesModel><Action _uid="998" /></TreeNodesModel>
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="Child"><Script _uid="4" name="Repeated" /></BehaviorTree>
  <TreeNodesModel><Action ID="Script" _uid="999" /></TreeNodesModel>
</root>"""


def event(uid=1, sec=1_792_056_691, nanosec=5, status="RUNNING", name="Repeated"):
    return {
        "timestamp": {"sec": sec, "nanosec": nanosec},
        "node_name": name,
        "uid": uid,
        "previous_status": "IDLE",
        "current_status": status,
    }


def message(*events):
    return SimpleNamespace(event_log=[
        SimpleNamespace(**{**entry, "timestamp": SimpleNamespace(**entry["timestamp"])})
        for entry in events
    ])


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.xml = self.root / "tree.xml"
        self.xml.write_text(XML, encoding="utf-8")
        self.bag = self.root / "test.mcap"
        self.output = self.root / "data" / "events.json"

    def write_bag(self, batches, compression=CompressionType.ZSTD):
        with self.bag.open("wb") as stream:
            writer = Writer(stream, compression=compression)
            schema = writer.register_msgdef("nav2_msgs/msg/BehaviorTreeLog", SCHEMA)
            for index, events in enumerate(batches):
                writer.write_message(
                    topic=TOPIC, schema=schema,
                    message={"timestamp": {"sec": 42, "nanosec": 0}, "event_log": events},
                    # Deliberately opposite to file order: reception time must not break ties.
                    log_time=(len(batches) - index) * 1_000_000_000,
                    publish_time=0, sequence=index,
                )
            xml_schema = writer.register_msgdef("std_msgs/msg/String", "string data")
            writer.write_message(
                topic="/behavior_tree_xml", schema=xml_schema,
                message={"data": "not used for UID validation"}, log_time=0, publish_time=0,
            )
            writer.finish()

    def test_real_decoder_all_events_exact_times_stable_ties_and_repeatable_json(self):
        batches = [
            [event(nanosec=6), event(2, nanosec=5, status="SUCCESS")],
            [event(3, nanosec=5, status="FAILURE"), event(2, nanosec=5, status="SUCCESS")],
        ]
        for compression in (CompressionType.NONE, CompressionType.ZSTD, CompressionType.LZ4):
            with self.subTest(compression=compression):
                self.write_bag(batches, compression)
                dataset = export_events(self.bag, self.xml, self.output)
                first_bytes = self.output.read_bytes()
                self.assertEqual(json.loads(first_bytes), dataset)
                self.assertEqual(dataset["messageCount"], 2)
                self.assertEqual(dataset["uniqueUidCount"], 3)
                self.assertEqual(dataset["unmatchedUids"], [])
                self.assertEqual(dataset["startTimestampNs"], "1792056691000000005")
                self.assertEqual(dataset["durationMs"], 0.000001)
                self.assertEqual([e["uid"] for e in dataset["events"]], ["2", "3", "2", "1"])
                self.assertEqual([e["index"] for e in dataset["events"]], [0, 1, 2, 3])
                self.assertEqual([e["offsetMs"] for e in dataset["events"]], [0, 0, 0, 0.000001])
                for entry in dataset["events"]:
                    self.assertEqual(set(entry), {
                        "index", "timestampNs", "offsetMs", "uid", "nodeName",
                        "previousStatus", "currentStatus",
                    })
                export_events(self.bag, self.xml, self.output)
                self.assertEqual(self.output.read_bytes(), first_bytes)

    def test_xml_uses_all_definitions_and_uids_not_names_or_models(self):
        self.assertEqual(collect_xml_uids(self.xml), {"1", "2", "3", "4"})
        self.assertEqual(normalize_uid(" 0003 "), normalize_uid(3))
        for value in (None, True, 3.1, -1, "", "-1", "+1", "1e2", "٣"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_uid(value)

    def test_unmatched_events_are_retained_and_reported_in_json_and_cli(self):
        self.write_bag([[event(999), event(999), event(2)]])
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = main(["--bag", str(self.bag), "--xml", str(self.xml), "--output", str(self.output)])
        self.assertEqual(code, 0)
        dataset = json.loads(self.output.read_text())
        self.assertEqual(len(dataset["events"]), 3)
        self.assertEqual(dataset["unmatchedUids"], ["999"])
        self.assertEqual(dataset["unmatchedEventCount"], 2)
        self.assertIn("999", stderr.getvalue())
        self.assertIn("1 unmatched UIDs (2 events)", stdout.getvalue())

    def test_empty_event_arrays_are_valid_but_missing_topic_is_an_error(self):
        self.write_bag([[], []])
        data = export_events(self.bag, self.xml, self.output)
        self.assertEqual(data["messageCount"], 2)
        self.assertEqual(data["events"], [])
        self.assertIsNone(data["startTimestampNs"])
        self.assertEqual(data["durationMs"], 0)
        self.write_bag([])
        with self.assertRaisesRegex(ExportError, "topic is missing or empty"):
            export_events(self.bag, self.xml, self.output)
        with self.bag.open("wb") as stream:
            writer = RawWriter(stream)
            writer.start(profile="ros2")
            writer.finish()
        with self.assertRaisesRegex(ExportError, "topic is missing or empty"):
            export_events(self.bag, self.xml, self.output)

    def test_negative_ros_seconds_and_unknown_status_strings_are_preserved(self):
        data = build_dataset([message(event(sec=-1, nanosec=999_999_999, status="SKIPPED"))], {"1"})
        self.assertEqual(data["events"][0]["timestampNs"], "-1")
        self.assertEqual(data["events"][0]["currentStatus"], "SKIPPED")

    def test_invalid_event_fields_have_message_and_array_context(self):
        invalid = [event(nanosec=1_000_000_000), event(nanosec=-1), event(sec=1.1),
                   event(uid=None), event(status=""), event(status=2)]
        missing_uid = event()
        del missing_uid["uid"]
        invalid.append(missing_uid)
        for entry in invalid:
            with self.subTest(entry=entry), self.assertRaisesRegex(ExportError, r"message 1, event_log\[0\]"):
                build_dataset([message(entry)], {"1"})
        with self.assertRaisesRegex(ExportError, "no event_log array"):
            build_dataset([SimpleNamespace()], {"1"})

    def test_missing_inputs_and_invalid_xml(self):
        with self.assertRaisesRegex(ExportError, "Missing recording file"):
            export_events(self.bag, self.xml, self.output)
        self.write_bag([[event()]])
        with self.assertRaisesRegex(ExportError, "Missing XML file"):
            export_events(self.bag, self.root / "missing.xml", self.output)
        for xml in ("<root>", "<html/>", '<root BTCPP_format="4"/>',
                    '<root BTCPP_format="4"><BehaviorTree ID="T"><A _uid="bad"/></BehaviorTree></root>'):
            with self.subTest(xml=xml):
                self.xml.write_text(xml)
                with self.assertRaises(ExportError):
                    export_events(self.bag, self.xml, self.output)
                self.assertFalse(self.output.exists())

    def test_empty_invalid_and_truncated_recordings_preserve_previous_output(self):
        self.write_bag([[event()]])
        valid = self.bag.read_bytes()
        self.output.parent.mkdir()
        self.output.write_text("previous successful export")
        for content in (b"", b"not an MCAP", valid[:len(valid) // 2]):
            with self.subTest(size=len(content)):
                self.bag.write_bytes(content)
                with self.assertRaisesRegex(ExportError, "Cannot read/decode MCAP"):
                    export_events(self.bag, self.xml, self.output)
                self.assertEqual(self.output.read_text(), "previous successful export")

    def test_unexpected_schema_and_unsupported_encoding_fail_clearly(self):
        with self.bag.open("wb") as stream:
            writer = Writer(stream)
            schema = writer.register_msgdef("std_msgs/msg/String", "string data")
            writer.write_message(TOPIC, schema, {"data": "wrong type"}, log_time=0, publish_time=0)
            writer.finish()
        with self.assertRaisesRegex(ExportError, "Unexpected message type"):
            export_events(self.bag, self.xml, self.output)
        with self.bag.open("wb") as stream:
            writer = RawWriter(stream, compression=CompressionType.NONE)
            writer.start(profile="ros2")
            schema_id = writer.register_schema("nav2_msgs/msg/BehaviorTreeLog", "jsonschema", b"{}")
            channel = writer.register_channel(TOPIC, "json", schema_id)
            writer.add_message(channel, log_time=0, publish_time=0, data=b"{}")
            writer.finish()
        with self.assertRaisesRegex(ExportError, "Cannot read/decode MCAP"):
            export_events(self.bag, self.xml, self.output)

    def test_output_cannot_replace_inputs_even_through_aliases(self):
        self.write_bag([[event()]])
        for path in (self.bag, self.xml):
            before = path.read_bytes()
            alias = self.root / "alias.json"
            alias.symlink_to(path)
            for output in (path, alias):
                with self.assertRaisesRegex(ExportError, "must not overwrite"):
                    export_events(self.bag, self.xml, output)
            alias.unlink()
            self.assertEqual(path.read_bytes(), before)

    def test_output_errors_preserve_existing_export_and_remove_temp_file(self):
        self.output.parent.mkdir()
        self.output.write_text("previous successful export")
        with patch.object(Path, "replace", side_effect=PermissionError("read-only destination")):
            with self.assertRaisesRegex(ExportError, "Cannot write output"):
                write_dataset({"events": []}, self.output)
        self.assertEqual(self.output.read_text(), "previous successful export")
        self.assertEqual(list(self.output.parent.iterdir()), [self.output])
        blocked = self.root / "file-not-directory"
        blocked.write_text("occupied")
        with self.assertRaisesRegex(ExportError, "Cannot write output"):
            write_dataset({}, blocked / "events.json")

    def test_cli_failure_is_actionable_without_traceback(self):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            code = main(["--bag", str(self.bag), "--xml", str(self.xml), "--output", str(self.output)])
        self.assertEqual(code, 1)
        self.assertIn("Missing recording file", stderr.getvalue())
        self.assertNotIn("Traceback", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()

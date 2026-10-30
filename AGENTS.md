# Repository instructions

## Branches and releases

- Use `develop` for ongoing code and documentation work. Check the current branch
  and working tree before editing; preserve existing uncommitted changes.
- Create contribution branches from `develop` and target `develop` in pull
  requests. Include the relevant verification and screenshots for visual changes.
- Keep `main` for release-ready code. Do not do ordinary development directly on
  `main`; switch to `develop` safely first. Follow an explicitly requested branch
  when the user specifies one.
- Prepare release metadata and version changes on `develop`, run the relevant
  checks, then promote the changes to `main` through a pull request.
- Build and publish releases from a clean `main` checkout. Associate each released
  package version with its source commit using a matching `vX.Y.Z` tag.
- Merging to `main`, creating release tags, and publishing are release tasks;
  do not perform them as a side effect of ordinary development work.
- Branch names do not control package versions or trigger publishing. Consumers
  install versioned packages independently of the source branches.
- Publish `@adnanmk-1999/behavior-tree-viewer` manually to GitHub Packages using
  the manifest's `publishConfig.registry`. Start with GitHub's default private
  visibility. Moving to npmjs.com or a company scope is a separate migration.
- Keep package authentication tokens out of the repository and package archive.
  Use user-level npm credentials; GitHub authentication for Git is separate.

## Project boundaries

- Keep the reusable viewer and the standalone playground in this repository.
  `src/App.vue` owns loading and navigation; it uses local player source. Host
  applications supply live statuses. `BehaviorTreePlayer` owns replay timing
  and transport, including the optional Live/Replay switch. Hosts must supply
  `mode="live"` or `mode="replay"` (or an initialized `v-model:mode`) and may enable
  `showModeSwitch`; the playground uses this package-owned switch
  and supplies no viewport markup.
  Replay controls form a wide, low viewport bar beside Tree Details; the mode
  switch remains in the player's toolbar outside the canvas.
- `src/index.ts` is the public library entry point: the viewer, player, XML and
  recording parsers, and tree/status/recording types. The package also exports
  `style.css`. Keep layout utilities, icons, and child components internal.
- Vue is a peer dependency and stays external to the library bundle. Reuse the
  existing Vue Flow, Dagre, Vite, and `vue-tsc` tooling.
- Keep demo output in `dist/` and library output in `dist-library/`. Include only
  the declared library files in the package, excluding demo XML and recordings.
- Preserve the viewer's read-only behavior, accessibility, and UID status mapping.
  Keep raw MCAP recordings local. Files under `public/` are served with the demo.

## Verification

- For application or viewer changes, run `npm test`, `npm run build`, and
  `npm run lint`; the build includes TypeScript checks.
- With `npm run dev` running, open `/tests/behaviorTreeSizing.html` to check
  initial label widths, click stability, and truncation with inherited fonts.
- For package API, declarations, dependencies, or build changes, also run
  `npm run test:package` to check the archive in a separate consumer.
- For exporter changes, install `scripts/requirements.txt` in `.venv` and run
  `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`.
- For documentation-only changes, check commands, paths, and formatting without
  rerunning unrelated code tests.

## Documentation

- Keep the README focused on the live demo, screenshot, installation, viewer API,
  theming, dependencies, and contributing. Put the demo link first and use
  `public/Behavior_Tree_Visualizer.png` for the screenshot. Use an absolute image
  URL so the README also works on package pages, where public assets are absent.
- Keep publishing, release tags, registry migration, demo deployment, and other
  maintainer procedures in this file. Leave work-package logs and historical
  verification reports out of the README. Consumer authentication belongs with
  installation instructions in the README.
- Describe the actual package state: the manifest targets GitHub Packages and
  supports local packing. Configuration and a successful dry run do not mean a
  version has been published. Keep release and consumer commands in sync with it.

## Package builds and releases

The package is `@adnanmk-1999/behavior-tree-viewer`. Version `0.1.0` has been
published to GitHub Packages and tagged `v0.1.0`. Use a new version for subsequent
releases; do not move an existing release tag.

### Local packaging

```sh
npm run build:lib
npm run test:package
npm pack
```

`build:lib` emits JavaScript, CSS, and declarations into `dist-library/`.
`test:package` installs the local archive in a temporary consumer, checks its
public types, and builds it. `npm pack` runs the library build and produces a
versioned `.tgz`. For `0.1.0`, that filename is
`adnanmk-1999-behavior-tree-viewer-0.1.0.tgz`.

The archive must contain the public library files, README, package metadata, and
`public/licenses/material-design-icons.txt`. Keep demo XML, recordings, the
screenshot, application code, and development tools outside the archive. Update
the expected archive contents in `tests/package/package.test.mjs` when changing
the package file list.

### Publisher authentication

Create a **personal access token (classic)** in
[GitHub token settings](https://github.com/settings/tokens) with `write:packages`
and `read:packages`. A fine-grained token does not support this registry login.
Authenticate using the GitHub username and the token as the password:

```sh
npm login --scope=@adnanmk-1999 --auth-type=legacy --registry=https://npm.pkg.github.com
```

Store credentials in the user's npm configuration, outside the repository.
GitHub CLI authentication for `git push` is separate. Consumers need
`read:packages` and access to the package. See
[GitHub's npm registry guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
and [package permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages).

The manifest's `publishConfig.registry` selects `https://npm.pkg.github.com`, and
`repository` links the package to this repository. The npm `private: true` flag
would block all publication; GitHub package visibility is managed separately in
package settings and defaults to private on first publication.

### Release procedure

1. Prepare changes on `develop`. For a patch release, run
   `npm version patch --no-git-tag-version` to update both package manifests
   without creating a tag on the development branch. Choose a minor or major
   version when the public API change requires it, and update README examples.
2. Run the relevant checks, commit and push, then merge a pull request from
   `develop` into `main`.
3. Start from a clean working tree and verify the merged release:

   ```sh
   git switch main
   git pull --ff-only origin main
   npm ci
   npm test
   npm run build
   npm run lint
   npm run test:package
   npm publish --dry-run
   git status --short
   ```

   Confirm the destination is `https://npm.pkg.github.com`, the archive contains
   only the expected files, and the working tree remains clean. A dry run does
   not upload the package or prove publish access. Resolve any lint changes
   through the development branch before releasing.

4. Publish from this clean `main` checkout:

   ```sh
   npm publish
   ```

5. Only after publishing succeeds, tag and push that source commit:

   ```sh
   bt_viewer_release_version=$(node -p "require('./package.json').version")
   git tag -a "v$bt_viewer_release_version" -m "Release $bt_viewer_release_version"
   git push origin "v$bt_viewer_release_version"
   ```

6. Install the released version from GitHub Packages in a separate consumer and
   verify its exports, types, CSS, and production build. Local archive tests do
   not verify the published registry artifact.

### Registry or ownership migration

A move to npmjs.com requires an npm account with access to the chosen scope,
an update to `publishConfig.registry`, and publication to that registry.
Consumers must update their scope-to-registry mapping and reinstall to refresh
lockfile URLs. A move to a company scope also changes the package name and
import paths. Update the README and these instructions as part of the migration.

## Demo maintenance

The live demo is https://adnanmk-1999.github.io/behavior-tree-visualizer/.
The standalone app loads `public/tree.xml` and
`public/data/behavior-tree-events.json`. If a recording is missing or invalid,
tree navigation and inspection remain available. Keep the demo screenshot at
`public/Behavior_Tree_Visualizer.png` current when the interface changes.

### GitHub Pages deployment

The [Pages workflow](.github/workflows/deploy-pages.yml) is manual and deploys the
standalone app independently of package publication.

1. In repository Settings → Pages, select GitHub Actions as the source.
2. Run Actions → Deploy demo to GitHub Pages on `main`.
3. Verify the live demo after the deployment succeeds.

The workflow checks the approved demo fixtures, runs tests and type checking,
and builds with the repository's Pages base path. Everything under `public/`
is downloadable from the demo site; keep raw recordings local.

### Recording export

Use Python 3.10+ to generate demo playback JSON from a ROS 2 MCAP file:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
.venv/bin/python scripts/export_bt_events.py \
  --bag /path/to/recording.mcap \
  --xml public/tree.xml \
  --output public/data/behavior-tree-events.json
```

The exporter reads `/behavior_tree_log` using the embedded schema; ROS is not
required. It preserves transitions, sorts by event time, checks UIDs against
the XML, and retains unmatched UIDs with warnings. Absolute nanosecond timestamps
remain strings. Each export loads one file's transitions into memory, does not
merge split bags or correct clock resets, and replaces output atomically after
successful extraction.

Run the Python checks after exporter changes:

```sh
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

With the dev server running, `/tests/parseBehaviorTree.html` checks the browser
XML parser and graph against the supplied fixture. The recording types live in
`src/types/behaviorTreeEvents.ts`.

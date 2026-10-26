# Repository instructions

## Branches and releases

- Use `develop` for ongoing code and documentation work. Check the current branch
  and working tree before editing; preserve existing uncommitted changes.
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
  `src/App.vue` owns loading, navigation, and playback; it uses local viewer source.
- `src/index.ts` is the public library entry point: the viewer, XML parser, and
  tree/status types. The package also exports `style.css`. Keep layout utilities,
  icons, and child components internal.
- Vue is a peer dependency and stays external to the library bundle. Reuse the
  existing Vue Flow, Dagre, Vite, and `vue-tsc` tooling.
- Keep demo output in `dist/` and library output in `dist-library/`. Include only
  the declared library files in the package, excluding demo XML and recordings.
- Preserve the viewer's read-only behavior, accessibility, and UID status mapping.
  Keep raw MCAP recordings local. Files under `public/` are served with the demo.

## Verification

- For application or viewer changes, run `npm test`, `npm run build`, and
  `npm run lint`; the build includes TypeScript checks.
- For package API, declarations, dependencies, or build changes, also run
  `npm run test:package` to check the archive in a separate consumer.
- For exporter changes, install `scripts/requirements.txt` in `.venv` and run
  `.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`.
- For documentation-only changes, check commands, paths, and formatting without
  rerunning unrelated code tests.

## Documentation

- Keep the README focused on current setup, usage, architecture, packaging, and
  the development/release workflow. Leave work-package logs and historical
  verification reports out of it.
- Describe the actual package state: the manifest targets GitHub Packages and
  supports local packing. Configuration and a successful dry run do not mean a
  version has been published. Keep release and consumer commands in sync with it.

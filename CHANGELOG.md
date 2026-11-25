# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-11-25

### Fixed

- A pnpm release deprecated on npm as broken (11.13.0) is no longer recorded in
  `packageManager` and the Dockerfile: the CLI warns and records the verified
  11.29.0, so the generated GitHub Actions setup can install it.
- Existing workspaces: an app directory excluded by a negated glob
  (`!apps/excluded`) is refused before anything is written, instead of being
  created outside the workspace.
- `--save-config <path>` is listed in the review; inside an existing workspace
  it needs the same approval as other workspace changes.
- The generated README lists every file to change when removing an example
  (home page, examples menu, admin sidebar, e2e routes, `AGENTS.md`) and
  mentions `--no-examples`.
- `package.json` has `repository`, `homepage` and `bugs`.
- New monorepo: an `--app-dir` outside `apps/` is added to the workspace
  packages. Before, the app was not installed or checked, yet the run passed.
- `--config` in interactive mode: the file's answers are no longer asked again
  and overridden by prompt defaults.
- Existing workspace with `--config`: the app name on the command line wins.
- Scoped app names (`@acme/web`) get `apps/web`, so saved configs load again.
- `npm create produx-app ... --mode monorepo` uses pnpm instead of failing with
  "requested: npm".
- The interactive app directory is validated like `--app-dir`; an empty
  `--features` list is an error; workspace-only options in a standalone run are
  reported as ignored.

## [0.1.0] - 2026-11-25

### Added

- Interactive and non-interactive CLI (`create-produx-app`) with one generation
  engine for standalone apps, new pnpm monorepos (optional Turborepo) and apps
  added to existing workspaces.
- Presets: Minimal, Standard, Admin, Enterprise, Custom; 39 feature modules
  with dependency resolution, conflict detection and package-manager checks.
- Reusable `produx.config.json` (schema version 1) with `--config` and `--save-config`.
- Post-install validation: type check, lint, unit tests and production build.
- Safe writes: staging directory, rollback on cancel, no overwrites, explicit
  approval for changes to an existing workspace.
- Generated apps follow Feature-Sliced Design (`app`, `pages`, `features`,
  `entities`, `shared`; slices imported through their `index.ts`), enforced by
  `eslint-plugin-boundaries` in `lint`, also when ESLint runs from a monorepo root.
- A token-based design system in `src/shared/ui` (`PageHeader`, `LoadingState`,
  `ErrorState`, `EmptyState`), no horizontal scroll at 375 px, and WCAG 2.2 AA
  contrast in the light and dark themes.
- Storybook 10 (Enterprise preset or `+storybook`): stories for the shared
  components, a design-token page, and story tests in Chromium that fail on
  accessibility violations.
- `E2E_PORT` sets the Playwright preview port (default 4173).
- Validation harness (`scripts/validate.ts`), interactive pty check,
  shadcn vendoring script and version check script. CI runs the CLI's tests on
  Linux, macOS and Windows and generates projects on all three.

### Fixed during validation

- Package manager version detection ignored stderr, so a Corepack download
  notice no longer produces an invalid `packageManager`.
- Generated tests pass from a short (8.3) Windows path: the `@/` alias and
  Vite's root use the real path, and jest-dom matchers are registered on the
  setup file's `expect`.
- The Storybook addon lint checks the app's own `package.json`.
- The Dockerfile fallback pnpm is 11.29.0 (11.13.0 is deprecated on npm).
- The `bin` entry is `dist/index.mjs`: npm 11 publish dropped `./dist/index.mjs`.

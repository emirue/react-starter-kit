# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

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

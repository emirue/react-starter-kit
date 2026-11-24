# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

### Added

- Interactive and non-interactive CLI (`create-produx-app`) with one generation
  engine for standalone apps, new pnpm monorepos (optional Turborepo) and apps
  added to existing workspaces.
- Presets: Minimal, Standard, Admin, Enterprise, Custom; 38 feature modules
  with dependency resolution, conflict detection and package-manager checks.
- Reusable `produx.config.json` (schema version 1) with `--config` and `--save-config`.
- Post-install validation: type check, lint, unit tests and production build.
- Safe writes: staging directory, rollback on cancel, no overwrites, explicit
  approval for changes to an existing workspace.
- Validation harness (`scripts/validate.ts`), interactive pty check,
  shadcn vendoring script and version check script.

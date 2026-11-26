# Review guide

Read by reviewers of create-produx-app changes: GitHub Code Review reads this file from the base branch, and
`/verify` and `/code-review` in Claude Code apply it through `AGENTS.md`.

## Severity

- **Important**: a bug the change adds or makes worse. Includes a passing check that no longer tests what it claims.
- **Nit**: a minor issue. At most five per review.
- **Pre-existing**: a bug that was there before the change. Report it, do not block on it.

Do not review generated or vendored files: `docs/validation/results.json`, `pnpm-lock.yaml`, and the shadcn/ui
files that `scripts/vendor-shadcn.sh` writes into `templates/features/{shadcn,admin-layout}/when-ui-*`.

## Checklist from past defects

Each item came up at least twice in [the defect table](docs/validation-report.md#defects-found-by-validation-and-fixed)
(numbers in "Source"). Apply only the items whose "When" matches the diff; usually a few.

1. **Cancel and child processes**
   - When: signal handling in `src/core/run.ts`, the journal and rollback in `src/core/apply.ts`, `src/utils/exec.ts`,
     or how `scripts/validate.ts` starts servers.
   - Check: `python3 scripts/interactive-check.py` passes three runs in a row; after a harness run,
     `pgrep -fl produx-validate` prints nothing.
   - Source: 3, 20, 57, 58.
2. **Package manager version written into projects**
   - When: `src/adapters/package-manager.ts`, `commandVersion`, the `pnpm` entry in
     `src/config/dependency-versions.json`, or the Dockerfile and CI templates.
   - Check: the recorded version is not deprecated (`npm view pnpm@<version> deprecated` is empty); versions are
     parsed from stdout only.
   - Source: 32, 34, 42, 45.
3. **Commands for the chosen package manager**
   - When: package-manager adapters, generated scripts and READMEs, or harness steps that run a package manager.
   - Check: the `standard-npm`, `standard-yarn` and `standard-bun` scenarios; no `pnpm` call inside an npm, Yarn or
     Bun project.
   - Source: 1, 24, 54.
4. **Tools run from the workspace root**
   - When: the generated ESLint config, or any generated tool that reads `process.cwd()` or `./package.json`.
   - Check: the monorepo scenarios' "ESLint from the workspace root passes" and "... rejects an upward import"
     checks (`mono-enterprise`).
   - Source: 33, 41.
5. **Windows**
   - When: spawning commands, building or comparing paths, environment variables, or tests that fake a binary.
   - Check: commands go through execa (PATHEXT, `.cmd` shims); paths are compared after `realpathSync.native`;
     test environment overrides are case-insensitive; the CI `windows-latest` jobs pass.
   - Source: 35, 37, 43.
6. **Editing workspace files and app paths**
   - When: `src/core/workspace.ts`, `pnpmWorkspaceYaml` in `src/core/package-json.ts`, or validation of app names
     and directories.
   - Check: the app is listed in the workspace (`pnpm ls -r`); quotes, spaces, `#`, `..`, absolute and
     drive-relative paths are rejected; the `existing-*` and `mono-app-dir` scenarios.
   - Source: 11, 16, 17, 46, 50, 55.
7. **Writing outside the target or without approval**
   - When: the review and approval path in `src/core/run.ts`, `--save-config`, `create-produx-app .`, or existing
     workspace mode.
   - Check: every path outside the new app is listed in the review and needs approval; the existing-workspace
     scenarios' "refused without changing any file" and "no files outside the app changed" checks.
   - Source: 15, 18, 21, 22, 47.
8. **Contrast in light and dark themes**
   - When: tokens in `templates/base/app/src/index.css`, color classes in components, or the non-Tailwind CSS.
   - Check: `node scripts/validate.ts --browser` (axe in light and dark) and the harness check
     "test:storybook in the dark theme (Storybook)" (`enterprise`).
   - Source: 25, 26, 29, 36.
9. **Template branches that leave code or links behind**
   - When: `@if` blocks in templates, or the example pages and their README instructions.
   - Check: scenarios with the flag on and off (`standard-no-examples`, `router-none-examples`,
     `custom-primitives-no-tailwind`, `standard-radix-tsr-fetch`) type-check and lint; no link points to a removed
     page.
   - Source: 5, 28, 30, 48.
10. **Harness servers and ports**
    - When: preview or browser code in `scripts/validate.ts`, or the generated `playwright.config.ts`.
    - Check: the harness serves on `127.0.0.1` with `--strictPort`; generated e2e tests take their port from
      `E2E_PORT`; checks wait for a page state, not for a fixed time.
    - Source: 38, 39, 40.
11. **Config file and command-line precedence**
    - When: `src/core/resolve-config.ts`, `src/cli/options.ts` or `src/cli/prompts.ts`.
    - Check: a unit test per precedence rule (command line over `--config` file over defaults, also in interactive
      mode); options that do not apply produce a warning or an error, never silence.
    - Source: 51, 52, 54, 56.
12. **The published package**
    - When: `package.json` (`bin`, `files`, `exports`, metadata) or the build.
    - Check: `npm publish --dry-run` prints no warnings; the packed tarball runs with `npx`.
    - Source: 44, 49.

## Adding an item

Add an item only after the same kind of problem came up at least twice, and only when the diff alone shows whether
it applies. Remove items that no longer catch anything.

# Validation report

|                 |                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI version     | 0.1.0 (not published)                                                                                                                                                                                  |
| Report date     | 2026-11-24                                                                                                                                                                                             |
| Tested artifact | Generated-project matrix: `dist/index.mjs` built from the working tree of `refactor/fsd-architecture`. CLI packaging checks: the `npm pack` tarball of the same tree, installed outside the repository |
| Evidence        | [`docs/validation/results.json`](validation/results.json) (commands, exit codes, durations, environment)                                                                                               |

Status values: **PASS** (ran and succeeded), **FAIL** (ran and failed), **SKIPPED** (deliberately not run), **NOT TESTED** (could not be run here).

## Implementation summary

- One CLI and one generation engine for three modes: standalone, new pnpm monorepo (optional Turborepo, optional shared packages), and adding an app to an existing workspace.
- Presets Minimal, Standard, Admin, Enterprise and Custom built from 39 declarative feature modules with requirement resolution, conflict and cycle detection, mode and package-manager limits.
- Generated apps follow one layered architecture (Feature-Sliced Design: `app`, `pages`, `features`, `shared`, slice public APIs) enforced by `eslint-plugin-boundaries` in `lint`, with a token-based design system (`PageHeader`, loading/error/empty states), responsive and WCAG 2.2 AA rules and an optional Storybook 10 workshop with browser story tests: [architecture/frontend-architecture.md](architecture/frontend-architecture.md), [refactoring/](refactoring/audit-report.md).
- Interactive prompts that ask only for undecided choices; full non-interactive mode; dry run; reusable `produx.config.json`.
- Post-install validation inside the CLI (type check, lint, unit tests, build) with per-step PASS/FAIL/SKIPPED reporting and exit codes.
- Safe writes (staging + rename, no overwrites, symlink-aware containment, rollback journal, Ctrl+C rollback) and an explicit approval path for existing-workspace changes.
- shadcn/ui components vendored from the official registry (reproducible without network), Base UI and Radix variants.
- Validation harness, interactive pty check, vendoring and version-check scripts, Renovate configuration, CI workflow for this repository.

## Context7 usage summary

Context7 MCP was used for the first part of the research (Vite, React Router, TanStack, the CLI libraries and others; library IDs per package in [research/context7-references.md](research/context7-references.md)). During research the service returned `Monthly quota exceeded`. As required by spec §3.4 the user was asked and approved continuing with official sources: package READMEs and changelogs, installed `.d.ts` files, GitHub release notes, npm registry metadata, and running the official scaffolds (`create-vite` 9.3.4 `react-ts`; `shadcn init -t vite` 4.23.0 for Base UI and Radix). Where Context7 had only older pinned documentation than the selected version, the gap was closed from the installed package. Generated projects never require Context7, Claude Code or MCP.

## Versions

Latest stable versions and selected versions, with reasons for every exception (TypeScript 6.0.3 instead of 7.0.2; `@types/node` 22; pnpm 11.13.0 as the verified fallback; `@hookform/resolvers` 7.0.8 because 7.0.9 appeared after validation): [dependency-compatibility.md](dependency-compatibility.md).

## Repository checks

| Command                                                                                                               | Exit | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck`                                                                                                  | 0    | PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm run lint`                                                                                                       | 0    | PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm run format:check`                                                                                               | 0    | PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm run test:run`                                                                                                   | 0    | PASS: 13 files, 233 tests (unit + integration, including architecture tests for template placement, slice public APIs, design-system rules and feature requirements: help, version, dry run writes nothing, non-empty target refused, invalid names, invalid config and app directories, unvalidated combinations refused, save/load config reproduces identical files, `--save-config` never overwrites or targets the new project, existing-workspace install refused without approval) |
| `pnpm run build`                                                                                                      | 0    | PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm pack`                                                                                                            | 0    | PASS: 184 files, 99.7 kB; all 180 template files, `dist/index.mjs`, `README.md`, `LICENSE` included                                                                                                                                                                                                                                                                                                                                                                                       |
| Tarball installed outside the repo, `create-produx-app --version`                                                     | 0    | PASS: `0.1.0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm exec --package=<tarball> -- create-produx-app via-npm --preset minimal --yes --dry-run` (what `npm create` runs) | 0    | PASS: arguments passed, npm detected                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm --package=<tarball> dlx create-produx-app via-pnpm --preset minimal --yes --dry-run`                            | 0    | PASS: arguments passed, pnpm detected                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `python3 scripts/interactive-check.py <tarball bin>`                                                                  | 0    | PASS: defaults complete (exit 0); Ctrl+C at a prompt → exit 130, nothing written; Ctrl+C during install → exit 130, project rolled back                                                                                                                                                                                                                                                                                                                                                   |
| `actionlint` on this repository's `.github/workflows/ci.yml`                                                          | 0    | PASS in the previous round; the file is unchanged and was not re-run. Generated workflows are checked by actionlint in the matrix                                                                                                                                                                                                                                                                                                                                                         |

## Test environment

|                         |                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| OS                      | darwin arm64 (macOS)                                                                                                                        |
| Node.js                 | v26.13.0 (also: Standard generated and validated under 22.23.2 and 24.21.0, see below)                                                      |
| pnpm / npm / Yarn / Bun | 11.13.0 / 11.20.0 / 1.22.22 / 1.4.4                                                                                                         |
| Docker                  | Docker version 29.3.1, build c2be9cc                                                                                                        |
| CLI under test          | 0.1.0, `dist/index.mjs` built from the working tree (the packed tarball of the same tree passed the packaging and interactive checks above) |
| Browser                 | Playwright Chromium headless shell (bundled with Playwright 1.65.1)                                                                         |

## Generated-project matrix

Command: `node scripts/validate.ts --browser --shadcn-add` (one full run on the final tree, 2026-11-24 22:15–22:45, exit 0). 31 scenarios, 649/649 checks passed.

For every successful generation the harness also checks that no package of an unselected feature is installed, runs `format:check` when Prettier is selected, `test:e2e` when Playwright is selected, builds and runs the Docker image when Docker is selected, runs actionlint when GitHub Actions is selected, starts `vite preview` and checks rendering, Tailwind styles, direct deep links (SPA fallback) and console errors in Chromium, and with `--shadcn-add` adds a shadcn/ui component that was not installed (`accordion`) with the official CLI, then type-checks and builds. shadcn invocation recorded: pnpm dlx shadcn@latest add accordion --yes (resolved shadcn 4.23.0).

Expected-failure scenarios (`expectExit: 1`) assert that the CLI refuses and that no file in the workspace changed (SHA-256 of every file before and after).

### Presets and options (standalone)

| Scenario                      | Command (all with `--yes`)                                                                                                                   | Checks | Result | Not passing |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------- |
| minimal                       | `minimal --preset minimal`                                                                                                                   | 16     | PASS   | —           |
| standard                      | `standard`                                                                                                                                   | 24     | PASS   | —           |
| standard-no-examples          | `standard-no-examples --no-examples`                                                                                                         | 22     | PASS   | —           |
| standard-radix-tsr-fetch      | `standard-radix-tsr-fetch --ui radix --router tanstack-router --features +fetch,-axios`                                                      | 23     | PASS   | —           |
| admin-base-react-router       | `admin-base-react-router --preset admin --ui base --router react-router`                                                                     | 25     | PASS   | —           |
| admin-base-tanstack-router    | `admin-base-tanstack-router --preset admin --ui base --router tanstack-router`                                                               | 25     | PASS   | —           |
| admin-radix-react-router      | `admin-radix-react-router --preset admin --ui radix --router react-router`                                                                   | 25     | PASS   | —           |
| admin-radix-tanstack-router   | `admin-radix-tanstack-router --preset admin --ui radix --router tanstack-router`                                                             | 25     | PASS   | —           |
| enterprise                    | `enterprise --preset enterprise`                                                                                                             | 35     | PASS   | —           |
| enterprise-fetch-tsr-radix    | `enterprise-fetch-tsr-radix --preset enterprise --ui radix --router tanstack-router --features +fetch,-axios`                                | 34     | PASS   | —           |
| admin-no-examples             | `admin-no-examples --preset admin --no-examples`                                                                                             | 22     | PASS   | —           |
| custom-tooling                | `custom-tooling --features +tanstack-table,+eslint-query,+prettier-tailwind,+husky,+lint-staged,+vite-proxy,+env-validation,+github-actions` | 24     | PASS   | —           |
| custom-tailwind-primitives    | `custom-tailwind-primitives --preset minimal --features +tailwind,+react-router,+tanstack-query,+vitest,+testing-library`                    | 21     | PASS   | —           |
| custom-primitives-no-tailwind | `custom-primitives-no-tailwind --preset minimal --features +react-router,+tanstack-query,+vitest,+testing-library`                           | 20     | PASS   | —           |

### Package managers (standalone)

| Scenario               | Command (all with `--yes`)                                                        | Checks | Result | Not passing |
| ---------------------- | --------------------------------------------------------------------------------- | ------ | ------ | ----------- |
| standard-npm           | `standard-npm --package-manager npm`                                              | 21     | PASS   | —           |
| standard-npm-docker-ci | `standard-npm-docker-ci --package-manager npm --features +docker,+github-actions` | 29     | PASS   | —           |
| standard-bun           | `standard-bun --package-manager bun`                                              | 21     | PASS   | —           |
| standard-yarn          | `standard-yarn --package-manager yarn`                                            | 21     | PASS   | —           |

### New monorepo

| Scenario        | Command (all with `--yes`)                                                                          | Checks | Result | Not passing |
| --------------- | --------------------------------------------------------------------------------------------------- | ------ | ------ | ----------- |
| mono-turbo      | `mono-turbo --mode monorepo --app-name web --features +pkg-shared,+pkg-types,+pkg-ui`               | 26     | PASS   | —           |
| mono-enterprise | `mono-enterprise --mode monorepo --app-name web --preset enterprise --features +pkg-shared,+pkg-ui` | 37     | PASS   | —           |
| mono-no-turbo   | `mono-no-turbo --mode monorepo --app-name web --no-turbo --features +pkg-shared`                    | 24     | PASS   | —           |

### Existing workspace

| Scenario                       | Command (all with `--yes`)                                                                     | Checks | Result | Not passing |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------ | ------ | ----------- |
| existing-standard              | `--mode existing-workspace web --preset standard --allow-workspace-changes`                    | 27     | PASS   | —           |
| existing-install-unapproved    | `--mode existing-workspace web --preset minimal`                                               | 2      | PASS   | —           |
| existing-unlisted-dir          | `--mode existing-workspace web --app-dir tools/web`                                            | 2      | PASS   | —           |
| existing-duplicate-name        | `--mode existing-workspace api`                                                                | 2      | PASS   | —           |
| existing-unlisted-dir-approved | `--mode existing-workspace web --app-dir tools/web --allow-workspace-changes --preset minimal` | 22     | PASS   | —           |
| existing-orval                 | `--mode existing-workspace web --features +orval`                                              | 2      | PASS   | —           |
| existing-orval-approved        | `--mode existing-workspace web --features +orval --allow-workspace-changes`                    | 27     | PASS   | —           |
| existing-root-scripts          | `--mode existing-workspace web --preset minimal`                                               | 2      | PASS   | —           |
| existing-root-scripts-approved | `--mode existing-workspace web --preset minimal --allow-workspace-changes`                     | 22     | PASS   | —           |

### Checks executed (number of passing runs)

| Check                                                    | PASS count |
| -------------------------------------------------------- | ---------- |
| generate+install+verify                                  | 26         |
| Type checking                                            | 26         |
| Lint                                                     | 26         |
| Production build                                         | 26         |
| no packages of unselected features                       | 26         |
| design system: no raw color classes                      | 26         |
| lint rejects upward import (shared -> pages)             | 26         |
| lint rejects public API bypass (deep import into a page) | 26         |
| lint rejects file outside the layers                     | 26         |
| lint passes again without the canaries                   | 26         |
| preview server starts                                    | 26         |
| renders heading                                          | 26         |
| no console errors                                        | 26         |
| no axe violations (light)                                | 26         |
| no axe violations (dark)                                 | 26         |
| no horizontal overflow at 375 px                         | 26         |
| Unit tests                                               | 23         |
| format:check                                             | 21         |
| lint rejects sibling slice import (pages -> pages)       | 22         |
| shadcn add accordion + typecheck + build + lint          | 21         |
| Tailwind styles applied                                  | 22         |
| direct URL /examples/todos?filter=open                   | 3          |
| direct URL /examples/sign-up                             | 1          |
| direct URL /no/such/page                                 | 11         |
| direct URL /examples/todos?filter=done                   | 1          |
| docker build                                             | 4          |
| container becomes healthy (HEALTHCHECK)                  | 4          |
| runs as non-root                                         | 4          |
| SPA fallback for deep links                              | 4          |
| hashed assets cached immutably                           | 4          |
| security headers on SPA routes                           | 4          |
| missing asset is a non-cached 404                        | 4          |
| actionlint (GitHub workflows)                            | 5          |
| direct URL /users                                        | 6          |
| direct URL /settings                                     | 5          |
| direct URL /examples/todos                               | 5          |
| test:e2e (Playwright)                                    | 3          |
| build-storybook (Storybook)                              | 3          |
| test:storybook (Storybook)                               | 3          |
| husky hooks installed (core.hooksPath)                   | 1          |
| git commit runs lint-staged and succeeds                 | 1          |
| no nested git repository                                 | 7          |
| single root lockfile                                     | 3          |
| filtered build (pnpm --filter web build)                 | 3          |
| Turborepo cache hit on rebuild                           | 2          |
| CSS contains .border-l-4                                 | 2          |
| no files outside the app changed (except the lockfile)   | 4          |
| existing TypeScript backend still builds                 | 4          |
| existing app still builds                                | 4          |
| no app-level lockfile                                    | 4          |
| existing AGENTS.md kept                                  | 4          |
| CLI exits with 1                                         | 5          |
| refused without changing any file                        | 5          |
| no example pages without a router                        | 1          |

### Node.js versions

| Node.js | Command                                         | Exit | Result                                                                                                                    |
| ------- | ----------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| 22.23.2 | `create-produx-app std-node22 --yes` (Standard) | 0    | PASS before the architecture refactor; NOT TESTED on this tree                                                            |
| 24.21.0 | `create-produx-app std-node24 --yes` (Standard) | 0    | PASS before the architecture refactor; NOT TESTED on this tree                                                            |
| 26.13.0 | full matrix above                               | 0    | PASS                                                                                                                      |
| 24.14.0 | CLI start                                       | —    | Warning shown: generated projects need `^24.15.0` on Node 24 (Yarn 1 refuses to install there because of jsdom's engines) |

## Monorepo and existing-workspace results

- New monorepo with Turborepo: workspace detection not needed; single root lockfile; no nested git repository; filtered build (`pnpm --filter web build`); Turborepo cache hit on rebuild; shared packages imported by the app (type check, build and the `border-dashed` class from `packages/ui` present in the production CSS).
- New monorepo without Turborepo: same, via `pnpm -r`.
- Existing workspace fixture: another frontend app, a TypeScript backend (Node HTTP server compiled with `tsc`, importing a shared workspace package), a shared TypeScript package, a .NET directory outside the globs, an existing `AGENTS.md`. After adding the app: every file outside the app directory unchanged except the lockfile (and, when pnpm records fresh packages, `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, which the CLI reports), the backend and the other app still build, no nested git repository, no app lockfile, `AGENTS.md` kept.
- Refusals verified: unlisted app directory without approval, duplicate package name, Orval without approval for `allowBuilds`, root lifecycle scripts without approval, any install without approval.

## Backend integration results

| Item                                                                                             | Result               |
| ------------------------------------------------------------------------------------------------ | -------------------- |
| Frontend runs, tests and builds without a backend                                                | PASS (all scenarios) |
| TypeScript backend fixture in the same workspace keeps building; shared package usable from Node | PASS                 |
| Non-TypeScript backend directory untouched                                                       | PASS                 |
| Real NestJS project                                                                              | NOT TESTED           |
| Real ASP.NET Core project                                                                        | NOT TESTED           |
| Orval client generated from a local OpenAPI file, type-checked, built, exercised against MSW     | PASS                 |

## Platform results

| Platform         | CLI unit/integration tests                                                                            | Generated projects |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| macOS 26 (arm64) | PASS                                                                                                  | PASS               |
| Linux            | NOT TESTED as a host (generated apps were built inside `node:26.13.1-alpine3.24` Docker images: PASS) | NOT TESTED         |
| Windows          | NOT TESTED                                                                                            | NOT TESTED         |

The repository's CI workflow runs the unit/integration tests on Node 22.22.2 and 26 and generates Minimal, Standard and a Turborepo monorepo on Ubuntu, macOS and Windows. It has not run yet (nothing was pushed).

## Security findings

An independent review (separate agent, given only the code) reported nine findings; all were fixed and are listed below (15–23). Remaining notes:

- Base images are pinned by tag (`node:26.13.1-alpine3.24`, `nginxinc/nginx-unprivileged:1.30.6-alpine`), not by digest; Renovate can pin digests.
- Action SHAs were resolved from their release tags with the GitHub API during research; not re-verified offline.
- `pnpm audit` is part of the generated CI workflow but was not run here.
- No CSP header is set by default because the theme script in `index.html` is inline; add a CSP with a hash if you need one.

## Performance measurements

| Measurement             | Value                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| npm package             | 184 files, 99.7 kB packed, 389.8 kB unpacked                                                                                          |
| Generation durations    | see `ms` of the first check per scenario in `results.json` (includes network installs; machine- and cache-dependent, not a guarantee) |
| Enterprise Docker image | 61 MB (nginx-unprivileged alpine + build output; measured before the refactor, not re-measured)                                       |

## Defects found by validation and fixed

Each was reproduced first and re-tested after the fix.

| #   | Found by                                        | Defect                                                                                                                                                                                                                   | Fix                                                                                                                                              |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | CLI logs                                        | Validation commands ran as `pnpm pnpm run <script>` (worked with pnpm by accident; would fail with npm)                                                                                                                  | Pass the full argv from the adapter; npm, Yarn and Bun scenarios added                                                                           |
| 2   | pty check                                       | Pressing Enter on the name prompt (use default) was rejected as an empty name                                                                                                                                            | Empty input means "use the default"                                                                                                              |
| 3   | pty check                                       | Ctrl+C during install killed the process before rollback (`once` listener removed, default action ran)                                                                                                                   | Persistent SIGINT listener with re-entry guard                                                                                                   |
| 4   | harness                                         | TanStack Router: validated search params made `search` required on every link                                                                                                                                            | Optional search param                                                                                                                            |
| 5   | harness                                         | Without examples, the root layout kept unused imports (type check and lint failed)                                                                                                                                       | Imports gated by the same flags as their use                                                                                                     |
| 6   | browser                                         | Todo error demo never showed an error (default `retry: 1` hid a one-shot failure)                                                                                                                                        | "Server down / restore" toggle                                                                                                                   |
| 7   | browser                                         | React Router warned about a missing `HydrateFallback` with lazy routes                                                                                                                                                   | `HydrateFallback` on the root route                                                                                                              |
| 8   | generated tests                                 | Radix sidebar crashed: `Tooltip must be used within TooltipProvider`                                                                                                                                                     | Admin layout provides `TooltipProvider`                                                                                                          |
| 9   | generated lint                                  | shadcn/ui `use-mobile` violated `react-hooks/set-state-in-effect`                                                                                                                                                        | `useSyncExternalStore` implementation (not a rule override)                                                                                      |
| 10  | Docker check                                    | Nginx sent `Cache-Control: immutable` with 404s for missing assets                                                                                                                                                       | Cache header only on successful responses                                                                                                        |
| 11  | existing-workspace check                        | pnpm install silently changed the workspace's `pnpm-workspace.yaml` (`minimumReleaseAgeExclude`)                                                                                                                         | Detected and reported after install                                                                                                              |
| 12  | review                                          | Orval in an existing workspace needs `allowBuilds` at the root                                                                                                                                                           | Added through the approval path                                                                                                                  |
| 13  | review                                          | `produx.config.json` accepted shadcn styles that are not vendored                                                                                                                                                        | Only `nova` accepted                                                                                                                             |
| 14  | generated tests                                 | Todo error test raced against fast MSW responses                                                                                                                                                                         | Deterministic test order                                                                                                                         |
| 15  | independent review (high)                       | In an existing workspace, `--yes` alone ran workspace code during install: lifecycle scripts beyond the four detected (`preprepare`, `postprepare`, `pnpm:devPreinstall`), `.pnpmfile.cjs` and packages' install scripts | Install in an existing workspace always needs interactive confirmation or `--allow-workspace-changes`; detected scripts are listed in the review |
| 16  | independent review                              | `packages:` lists with items at column 0 (`- apps/*`) were not read: wrong glob added, YAML broken, name-clash check bypassed                                                                                            | Parser and editor accept both list styles                                                                                                        |
| 17  | independent review                              | Flow-style `allowBuilds: {…}` got a duplicate key; app paths with quotes, spaces or `#` broke YAML, Dockerfiles and CI files; drive-relative paths passed the schema                                                     | Flow style refused; `--app-dir` and `appDir` limited to `[A-Za-z0-9._-/]` relative paths                                                         |
| 18  | independent review                              | An absolute `--app-dir` could be saved into `produx.config.json`                                                                                                                                                         | Rejected at parse time (same rule as 17)                                                                                                         |
| 19  | independent review                              | No security headers from Nginx; location blocks would drop server-level headers                                                                                                                                          | `nosniff`, `Referrer-Policy`, `X-Frame-Options` in every location; checked by the harness                                                        |
| 20  | independent review                              | Ctrl+C while files were being written could leave the staging directory                                                                                                                                                  | Staging tracked by the journal immediately; writes stop once a rollback starts                                                                   |
| 21  | independent review                              | `create-produx-app .` replaced the current directory (new inode)                                                                                                                                                         | Files are moved into the existing empty directory                                                                                                |
| 22  | independent review                              | `--save-config <path inside the project>` replaced a generated file                                                                                                                                                      | Refused                                                                                                                                          |
| 23  | independent review                              | Generated defaults: Axios sent auth headers to absolute URLs; Orval's fetch mutator threw `SyntaxError` on non-JSON errors; checkout kept credentials                                                                    | `allowAbsoluteUrls: false`; `ApiError` for non-JSON; `persist-credentials: false`                                                                |
| 24  | final matrix                                    | The harness ran `pnpm` inside npm/Yarn/Bun projects for the shadcn check (refused by the project's `packageManager`)                                                                                                     | Harness uses each project's package manager                                                                                                      |
| 25  | Storybook a11y story tests                      | `destructive` button and badge text on `bg-destructive/10`: 4.0:1                                                                                                                                                        | `--destructive` light token darkened to 5.3:1                                                                                                    |
| 26  | harness axe (`standard`)                        | Home page `<code>` inherited `text-muted-foreground` on `bg-muted` (4.34:1)                                                                                                                                              | `text-foreground` on the code element                                                                                                            |
| 27  | harness axe (`router-none-examples`, `minimal`) | Without a router there was no `main` landmark; the first fix nested two `main` elements in the non-Tailwind page                                                                                                         | `app.tsx` renders `main` when there is no layout; pages never render `main` (also fixed in the non-Tailwind 404 page)                            |
| 28  | new scenario `custom-primitives-no-tailwind`    | Unused `EXAMPLES`, `Link` and `rows` in the non-Tailwind branches failed type check and lint                                                                                                                             | Examples listed in the non-Tailwind home page; `rows` only accepted with Tailwind                                                                |
| 29  | new scenario `custom-primitives-no-tailwind`    | Dark scheme: default link colors on an unset background failed contrast                                                                                                                                                  | `body` uses `Canvas`/`CanvasText`; links use `light-dark(#1d4ed8, #93c5fd)`                                                                      |
| 30  | generated type check (TanStack Router sandbox)  | `parseTodoFilter` imported but unused in the TanStack Router todos page                                                                                                                                                  | Import gated to React Router                                                                                                                     |
| 31  | e2e (test defects, fixed by the test author)    | `settle()` waited for zero `role="status"` (the sign-up form keeps an empty live region); the failed-chunk test blocked all JS, but TanStack Router reloads once on a missing chunk                                      | Wait for named loading regions only; block only scripts not loaded before the navigation                                                         |

## Unimplemented or restricted

- shadcn/ui styles other than `nova` (vega, maia, lyra, mira, luma, sera, rhea) and the `aria` base.
- Monorepo modes with npm, Yarn or Bun (refused with an explanation).
- Shared packages (`pkg-*`) in existing workspaces.
- A shared shadcn/ui package (shadcn monorepo registry setup); `packages/ui` holds plain React components.
- Orval without TanStack Query and MSW; Orval MSW/faker mock generation. The Orval client is generated at install time (not vendored); with `--no-install` the next steps include `api:generate`.
- Storybook with npm, Yarn or Bun, and Storybook without Playwright (CI installs Chromium for story tests then): not covered by a scenario.
- Docker for existing workspaces, and for Yarn or Bun projects.
- GitHub Actions workflows for Yarn or Bun projects.
- Real NestJS and ASP.NET Core integration (fixtures only, see above).

## Known limitations

- Linux and Windows were not run locally; the CLI uses POSIX-normalised template paths and Node path APIs, but Windows behaviour (paths, `.cmd` shims via execa) is unverified until the CI matrix runs.
- Generated projects need Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`; older Node.js versions get a warning before install.
- Projects generated within a day of a pinned package's release get `minimumReleaseAgeExclude` entries from pnpm.
- Large production bundles in Admin/Enterprise trigger Vite's chunk-size warning (not an error).
- The `shadcn add` check uses `shadcn@latest` from the network (see the scenario table for the version it resolved to).

## Remaining risks

| Risk                                                                    | Impact                                                                 | Mitigation                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Platform differences (Windows paths, shells)                            | CLI or generated scripts fail on Windows                               | Run `.github/workflows/ci.yml` (Linux/macOS/Windows) before release     |
| Upstream registry changes for shadcn/ui                                 | `shadcn add` in generated projects may differ from vendored components | Vendored components keep generation reproducible; re-vendor per release |
| New major versions (TypeScript 7 support in typescript-eslint, pnpm 12) | Pins drift behind latest                                               | Renovate + `check-versions.ts` weekly; majors need migration review     |
| GitHub Actions and CodeQL never executed                                | Workflow runtime failures                                              | actionlint passes; first run happens in the user's repository           |

## Release readiness

Not released. The package is ready for a maintainer decision with these conditions: run the CI matrix on Linux and Windows, review this report, then publish (`npm publish`) with the maintainer's approval. Nothing was pushed, published or released.

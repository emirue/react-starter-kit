# Validation of the architecture refactor

Date: 2026-11-24, platform validation 2026-11-25. Branch `refactor/fsd-architecture`, baseline `a223418`. Standard: [../architecture/frontend-architecture.md](../architecture/frontend-architecture.md). Full CLI report: [../validation-report.md](../validation-report.md); raw evidence: [../validation/results.json](../validation/results.json).

Status values: PASS (ran and succeeded), FAIL, NOT TESTED (not run here).

## Test-first evidence

Tests were written by a separate agent from the standard, before or alongside the implementation.

| Check                                                                | Result                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New tests against the baseline commit `a223418` (temporary worktree) | 61 of 84 new tests FAIL for the intended reasons: files outside any layer (`src/components/…`, `src/App.tsx`), imports of old locations (`@/lib/query-client`), `--features +orval` not adding MSW, `Unknown feature "storybook"`                                                                                                                                                                  |
| Same tests on the refactored tree: `pnpm test:run`                   | PASS: 13 files, 233 tests                                                                                                                                                                                                                                                                                                                                                                          |
| Each new harness check against a mutation                            | Lint canaries fail with a `boundaries/` rule naming the canary file; the `border-l-4` marker test fails with the old `border-dashed` marker; the `LoadingState` name test fails with the old non-Tailwind markup                                                                                                                                                                                   |
| Platform round (2026-11-25): each new unit test run before its fix   | FAIL for the intended reason: scenarios missing for Storybook per package manager and TanStack Router without Tailwind; `boundaries/root-path`, real-path `root`, jest-dom `expect.extend`, `E2E_PORT`, Storybook `packageJsonLocation` and the MSW ignore absent from the templates; `commandVersion` returned `12.23.0.tgz` for a Corepack notice. Now `pnpm test:run`: 14 files, 246 tests PASS |

## Generated-project matrix

macOS, Node 26: `node scripts/validate.ts --browser --shadcn-add`, one full run (2026-11-25 10:34–11:02) and a re-run of the 7 scenarios using Playwright, Storybook or MSW after the last two fixes (11:04–11:15, exit 0): 35 scenarios, 758/758 checks PASS. Details and the first run's three failures: [../validation-report.md](../validation-report.md#generated-project-matrix).

| Check (per scenario where it applies)                                                                                                                         | PASS                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lint rejects an upward import / a public-API bypass / a file outside the layers                                                                               | 30/30 each                                                                                        |
| Lint rejects a sibling-slice import                                                                                                                           | 26/26                                                                                             |
| Lint passes again after removing the canaries                                                                                                                 | 30/30                                                                                             |
| ESLint run from the workspace root passes, and still rejects an upward-import canary (new monorepos and existing workspaces)                                  | 7/7 each                                                                                          |
| Design system: no raw palette classes outside vendored shadcn/ui                                                                                              | 30/30                                                                                             |
| axe-core, WCAG 2.0–2.2 A/AA + best practice, light and dark, `/` and every deep link                                                                          | 30/30 each                                                                                        |
| No horizontal overflow at 375 px on `/` and every deep link                                                                                                   | 30/30                                                                                             |
| Playwright e2e (start page, navigation, 404, page error keeps the shell, dark mode, 375 px; Admin: sidebar collapse on desktop, no collapse button at 375 px) | 3/3 scenarios, 17 tests each                                                                      |
| `build-storybook`, `test:storybook`, and `test:storybook` again in the dark theme (a canary story fails unless the `dark` class is applied)                   | 6/6 each: Enterprise ×3 (pnpm) and Standard + Storybook without Playwright with npm, Yarn and Bun |
| `shadcn add accordion` writes into `src/shared/ui` and still type-checks, builds and lints                                                                    | 24/24                                                                                             |
| No example pages without a router                                                                                                                             | 1/1                                                                                               |
| Generated unit tests                                                                                                                                          | 27/27 scenarios                                                                                   |

New scenarios: `router-none-examples`, `custom-tailwind-primitives` (Tailwind without shadcn/ui), `custom-primitives-no-tailwind`, `custom-primitives-no-tailwind-tsr` (no Tailwind, TanStack Router, examples), `storybook-npm`, `storybook-yarn`, `storybook-bun`.

### Other platforms

| Where                                                        | What ran                                                                                                                                                                    | Result                                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Linux arm64 (Docker, Debian bookworm), Node 22.23.2, 24.21.0 | 9 scenarios with `--browser`, including Enterprise (e2e, Storybook, dark-theme stories) and a monorepo; 8 ran before the last two fixes, Enterprise again on the final code | PASS; Docker checks SKIPPED (no daemon in the container). [../validation/](../validation/) |
| GitHub Actions: Ubuntu, macOS, Windows (Node 26)             | Repository gates on Node 22.22.2 and 26; Minimal, Standard and a Turborepo monorepo without `--browser`                                                                     | PASS, Windows from its default short (8.3) temp path                                       |

## Manual checks during implementation

Sandboxes generated with the working tree (deleted afterwards):

- axe-core 4.14.1 on 7 routes × light/dark in Enterprise (Base UI, React Router, Axios) and Enterprise (Radix, TanStack Router, Fetch): 0 violations (before the refactor: duplicate and nested `main`, prohibited `aria-label`, avatar contrast 4.34:1, content outside landmarks).
- 375 px on 8 routes in both variants and in Tailwind-without-shadcn: no horizontal overflow, one `h1` and one `main` per page.
- Storybook in both variants: 12 story files / 28 tests, `build-storybook` exit 0. The a11y addon failed 2 stories until the `--destructive` token was fixed.
- `eslint-plugin-storybook` `flat/recommended` applies 10 `storybook/*` rules to story files.

## Defects found and fixed

See items 25–41 in [../validation-report.md](../validation-report.md#defects-found-by-validation-and-fixed) and items 6–14 in [audit-report.md](audit-report.md).

## NOT TESTED

- Windows with Playwright, Storybook, npm, Yarn or Bun, and browser checks on Windows and Linux x64 (the CI `generate` job runs Minimal, Standard and a monorepo without `--browser`).
- The CLI's own unit and integration tests on Windows and macOS runners (the CI `verify` job runs on Ubuntu).
- Ctrl+C rollback on Linux and Windows (measured on macOS only).
- Docker image builds on Linux (SKIPPED inside the containers; built and run on macOS).
- Updating an existing generated app to the new structure (documented by hand in [migration.md](migration.md), not automated).

# Validation of the architecture refactor

Date: 2026-11-24. Branch `refactor/fsd-architecture`, baseline `a223418`. Standard: [../architecture/frontend-architecture.md](../architecture/frontend-architecture.md). Full CLI report: [../validation-report.md](../validation-report.md); raw evidence: [../validation/results.json](../validation/results.json).

Status values: PASS (ran and succeeded), FAIL, NOT TESTED (not run here).

## Test-first evidence

Tests were written by a separate agent from the standard, before or alongside the implementation.

| Check                                                                | Result                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New tests against the baseline commit `a223418` (temporary worktree) | 61 of 84 new tests FAIL for the intended reasons: files outside any layer (`src/components/…`, `src/App.tsx`), imports of old locations (`@/lib/query-client`), `--features +orval` not adding MSW, `Unknown feature "storybook"` |
| Same tests on the refactored tree: `pnpm test:run`                   | PASS: 13 files, 233 tests                                                                                                                                                                                                         |
| Each new harness check against a mutation                            | Lint canaries fail with a `boundaries/` rule naming the canary file; the `border-l-4` marker test fails with the old `border-dashed` marker; the `LoadingState` name test fails with the old non-Tailwind markup                  |

## Generated-project matrix

`node scripts/validate.ts --browser --shadcn-add` on the final tree (one full run, 22:15–22:45): 31 scenarios, 649/649 checks PASS.

| Check (per scenario where it applies)                                                                                                                         | PASS                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Lint rejects an upward import / a public-API bypass / a file outside the layers                                                                               | 26/26 each                                             |
| Lint rejects a sibling-slice import                                                                                                                           | 22/22                                                  |
| Lint passes again after removing the canaries                                                                                                                 | 26/26                                                  |
| Design system: no raw palette classes outside vendored shadcn/ui                                                                                              | 26/26                                                  |
| axe-core, WCAG 2.0–2.2 A/AA + best practice, light and dark, `/` and every deep link                                                                          | 52/52                                                  |
| No horizontal overflow at 375 px on `/` and every deep link                                                                                                   | 26/26                                                  |
| Playwright e2e (start page, navigation, 404, page error keeps the shell, dark mode, 375 px; Admin: sidebar collapse on desktop, no collapse button at 375 px) | 3/3 scenarios, 17 tests each                           |
| `build-storybook` and `test:storybook` (Enterprise, Enterprise TanStack Router + Radix, Enterprise monorepo)                                                  | 3/3 each; 12 story files, 28 story tests in Enterprise |
| `shadcn add accordion` writes into `src/shared/ui` and still type-checks, builds and lints                                                                    | 21/21                                                  |
| No example pages without a router                                                                                                                             | 1/1                                                    |
| Generated unit tests                                                                                                                                          | 23/23 scenarios                                        |

New scenarios added for this change: `router-none-examples`, `custom-tailwind-primitives` (Tailwind without shadcn/ui), `custom-primitives-no-tailwind`.

## Manual checks during implementation

Sandboxes generated with the working tree (deleted afterwards):

- axe-core 4.14.1 on 7 routes × light/dark in Enterprise (Base UI, React Router, Axios) and Enterprise (Radix, TanStack Router, Fetch): 0 violations (before the refactor: duplicate and nested `main`, prohibited `aria-label`, avatar contrast 4.34:1, content outside landmarks).
- 375 px on 8 routes in both variants and in Tailwind-without-shadcn: no horizontal overflow, one `h1` and one `main` per page.
- Storybook in both variants: 12 story files / 28 tests, `build-storybook` exit 0. The a11y addon failed 2 stories until the `--destructive` token was fixed.
- `eslint-plugin-storybook` `flat/recommended` applies 10 `storybook/*` rules to story files.

## Defects found and fixed

See items 25–31 in [../validation-report.md](../validation-report.md#defects-found-by-validation-and-fixed) and items 6–14 in [audit-report.md](audit-report.md).

## NOT TESTED

- Storybook with npm, Yarn or Bun; Storybook without Playwright selected (the generated CI then installs Chromium itself).
- ESLint run from a monorepo root on the app (scenarios lint from the app through workspace scripts).
- Story a11y checks in the dark theme (story tests render the default light theme; dark mode is covered by the harness axe run on the app).
- Without Tailwind together with TanStack Router and examples (no scenario; React Router is covered by `custom-primitives-no-tailwind`).
- Node.js 22 and 24 on this tree (passed before the refactor).
- Linux and Windows hosts.
- Updating an existing generated app to the new structure (documented by hand in [migration.md](migration.md), not automated).

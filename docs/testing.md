# Testing

## Generated projects

| Tool                                        | Feature           | Command                         | Notes                                                                             |
| ------------------------------------------- | ----------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| Vitest 5 + jsdom                            | `vitest`          | `test` (watch), `test:run` (CI) | `src/**/*.test.{ts,tsx}`; passes with no tests                                    |
| React Testing Library, jest-dom, user-event | `testing-library` |                                 | `src/test/setup.ts` registers matchers and `cleanup` (globals are off)            |
| MSW 3                                       | `msw`             |                                 | Node server in tests (`onUnhandledFrame: "error"`), service worker in development |
| Playwright                                  | `playwright`      | `test:e2e`                      | Runs against `vite preview` of the production build                               |

Browsers for Playwright are not installed automatically (large download). Run once:

```bash
pnpm exec playwright install chromium
```

The generated GitHub Actions workflow installs Chromium with `--with-deps` before `test:e2e`.

What the generated tests cover: the app renders; queries load, mutate, invalidate, fail and recover; forms show field and server errors; the store persists only its preference; the API client normalizes errors; the admin table searches, pages and adds a user through the dialog; the error boundary recovers; Orval's client talks through MSW; and end-to-end smoke tests for the start page, the 404 page and dark mode.

## This repository

| Command                                                                          | What                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:run`                                                                  | Unit tests (resolver, schema, templates, generator, workspace, apply, options) and integration tests that run the CLI from source without installing |
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check`                               | Static checks                                                                                                                                        |
| `node scripts/validate.ts [--browser] [--shadcn-add] [--only a,b] [--cli <bin>]` | Generates real projects, installs, validates and records results in `docs/validation/results.json`                                                   |
| `python3 scripts/interactive-check.py`                                           | Drives the interactive prompts in a pseudo-terminal: defaults, Ctrl+C at a prompt, Ctrl+C during install                                             |
| `scripts/vendor-shadcn.sh`                                                       | Re-vendors shadcn/ui components from the official registry                                                                                           |
| `node scripts/check-versions.ts`                                                 | Lists pinned versions that are behind npm                                                                                                            |

The validation scenarios cover every preset, both UI bases with both routers, npm/Yarn/Bun standalone, new monorepos with and without Turborepo, existing workspaces with fixtures (another app, a TypeScript backend, a shared package, a .NET directory, root lifecycle scripts, unlisted app directories, duplicate names), Docker, actionlint and browser checks. A unit test fails if a selectable feature is not exercised by any scenario.

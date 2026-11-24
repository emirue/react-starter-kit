# Migration to the layered architecture

Plan, file map and rules for updating an app generated before this change. The standard is [../architecture/frontend-architecture.md](../architecture/frontend-architecture.md); the findings it resolves are in [audit-report.md](audit-report.md).

## Order of work

1. Moves without behaviour changes: template files moved to their layer, imports rewritten, slice `index.ts` files added (React Router and TanStack Router variants kept in step).
2. Shared design system: `PageHeader`, `LoadingState` / `ErrorState` / `EmptyState`; every page and data view uses them; responsive fixes (stacking, wrapping, 375 px without horizontal scroll).
3. Behaviour and accessibility fixes from the audit (error boundaries inside the layout, one `main`, `nav` landmark, skip link first, contrast, per-item pending state, empty-state text).
4. Enforcement: `eslint-plugin-boundaries` + `eslint-import-resolver-typescript` in the generated `eslint.config.js`.
5. Generator changes: examples need a router; `orval` requires `msw` and generates request functions; new `storybook` feature (Enterprise).
6. Tests first for each behaviour change (unit, component, e2e, story tests), then the validation matrix.

## File map (generated app)

| Before                                                                | After                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/App.tsx`                                                         | `src/app/app.tsx`                                                       |
| `src/layouts/root-layout.tsx`, `admin-layout.tsx`                     | `src/app/layouts/`                                                      |
| `src/pages/examples/examples-layout.tsx`                              | `src/app/layouts/examples-layout.tsx`                                   |
| `src/pages/route-error-page.tsx`                                      | `src/app/route-error.tsx`                                               |
| `src/components/error-boundary.tsx`                                   | `src/app/error-boundary.tsx`                                            |
| `src/stores/ui-store.ts`                                              | `src/app/model/ui-store.ts`                                             |
| `src/pages/home-page.tsx`                                             | `src/pages/home/ui/home-page.tsx` (+ `index.ts`)                        |
| `src/components/workspace-packages.tsx`                               | `src/pages/home/ui/workspace-packages.tsx`                              |
| `src/pages/{dashboard,settings,not-found}-page.tsx`                   | `src/pages/{dashboard,settings,not-found}/ui/*-page.tsx` (+ `index.ts`) |
| `src/pages/examples/examples-index-page.tsx`                          | `src/pages/examples/ui/examples-page.tsx`                               |
| `src/pages/examples/todos-page.tsx`, `src/features/todos/**`          | `src/pages/todos-example/{ui,api,model}/`                               |
| `src/pages/examples/sign-up-page.tsx`, `src/features/sign-up/**`      | `src/pages/sign-up-example/{ui,api,model}/`                             |
| `src/pages/examples/counter-page.tsx`, `src/features/counter/**`      | `src/pages/counter-example/{ui,model}/`                                 |
| `src/pages/users-page.tsx`, `src/features/users/**`                   | `src/pages/users/{ui,api,model}/`                                       |
| `src/components/theme/mode-toggle.tsx`                                | `src/features/switch-theme/ui/mode-toggle.tsx`                          |
| `src/components/theme/{theme-context,theme-provider,use-theme}.ts(x)` | `src/shared/lib/theme/` (+ `index.ts`)                                  |
| `src/components/ui/*`                                                 | `src/shared/ui/*`                                                       |
| `src/components/error-fallback.tsx`, `page-loader.tsx`                | `src/shared/ui/`                                                        |
| `src/lib/api-client.ts`                                               | `src/shared/api/http-client.ts`                                         |
| `src/lib/{api-error,query-client,orval-mutator}.ts`                   | `src/shared/api/`                                                       |
| `src/api/generated/**`                                                | `src/shared/api/generated/**`                                           |
| `src/lib/utils.ts`                                                    | `src/shared/lib/utils.ts`                                               |
| `src/hooks/use-mobile.ts`                                             | `src/shared/lib/use-mobile.ts`                                          |
| `src/config/env.ts`                                                   | `src/shared/config/env.ts`                                              |
| —                                                                     | `src/shared/ui/{page-header,state}.tsx`, `src/test/render.tsx`          |

Import rewrites: `@/components/ui/x` → `@/shared/ui/x`, `@/lib/utils` → `@/shared/lib/utils`, `@/lib/api-client` → `@/shared/api/http-client`, `@/components/theme/*` → `@/shared/lib/theme` or `@/features/switch-theme`, `@/layouts/*` → `@/app/layouts/*`, `@/pages/x-page` → `@/pages/x`. `components.json` aliases now point at `@/shared/ui` and `@/shared/lib`, so `shadcn add` writes into `src/shared/ui`.

## Updating an existing generated app

The CLI does not rewrite existing apps. To adopt the structure by hand:

1. Move files with `git mv` following the map, then rewrite imports (an editor's "update imports on move" does most of it).
2. Add an `index.ts` per page and feature slice that exports what other slices use.
3. Copy the `boundaries` block and the two dev dependencies from a freshly generated `eslint.config.js` and `package.json`, run `lint` and fix what it reports.
4. Update `components.json` aliases.
5. Run `typecheck`, `lint`, `test:run`, `build` and, if present, `test:e2e`.

## Rollback

The work is committed on `refactor/fsd-architecture` (not pushed) on top of the baseline `a223418`; reverting those commits, or resetting the branch to `a223418`, restores the previous templates. Generated apps are not touched by the CLI after generation.

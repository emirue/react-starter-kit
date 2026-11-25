# Features

Every feature is a declarative module in [`src/core/features.ts`](../src/core/features.ts) plus template files under `templates/features/<id>/`. Selecting a feature adds its packages (exact versions from `src/config/dependency-versions.json`), files and scripts; unselected features add nothing.

There are 39 features. Use the ids with `--features` (for example `--features +playwright,-zustand`).

Rules applied by the resolver:

- **Requires**: added automatically, and reported in the review (`Added for you`).
- **One of**: at least one must be present; the first is added if none is.
- **Conflicts**: selecting both is an error.
- **Modes / package managers**: selecting a feature outside them is an error, because that combination is not validated.
- Removing a feature (`-id`) that another selected feature requires is an error that names both.

## UI and styling

| Id         | Name         | Description                                                       | Packages                                                                                                                          | Requires             | Limits |
| ---------- | ------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| `tailwind` | Tailwind CSS | Tailwind CSS v4 through the official Vite plugin                  | `tailwindcss@4.3.5`<br>`@tailwindcss/vite@4.3.5`                                                                                  | —                    | —      |
| `lucide`   | Lucide React | Lucide icon components                                            | `lucide-react@1.79.0`                                                                                                             | —                    | —      |
| `shadcn`   | shadcn/ui    | shadcn/ui components on Base UI or Radix UI, with components.json | `shadcn@4.23.0`<br>`class-variance-authority@0.7.1`<br>`cn@0.5.2`<br>`tw-animate-css@1.4.0`<br>`@fontsource-variable/geist@5.3.0` | `tailwind`, `lucide` | —      |
| `theme`    | Theme        | Light, dark and system theme with a persisted preference          | —                                                                                                                                 | `tailwind`           | —      |

## State management

| Id                        | Name                    | Description                                               | Packages                                 | Requires         | Limits |
| ------------------------- | ----------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------- | ------ |
| `tanstack-query`          | TanStack Query          | Server state: QueryClient, provider and query key factory | `@tanstack/react-query@5.108.4`          | —                | —      |
| `tanstack-query-devtools` | TanStack Query Devtools | Query devtools, development builds only                   | `@tanstack/react-query-devtools@5.108.4` | `tanstack-query` | —      |
| `zustand`                 | Zustand                 | Shared client state with typed stores and selectors       | `zustand@5.1.0`                          | —                | —      |

## Routing

| Id                | Name            | Description                                                  | Packages                                                                                                 | Requires | Limits                       |
| ----------------- | --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| `react-router`    | React Router    | Data router with layouts, nested routes, lazy routes and 404 | `react-router@8.5.2`                                                                                     | —        | conflicts: `tanstack-router` |
| `tanstack-router` | TanStack Router | File-based, type-safe routing with the Vite plugin           | `@tanstack/react-router@1.170.46`<br>`@tanstack/router-plugin@1.169.0`<br>`@tanstack/router-cli@1.168.0` | —        | conflicts: `react-router`    |

## API

| Id           | Name           | Description                                                                     | Packages       | Requires                                        | Limits             |
| ------------ | -------------- | ------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- | ------------------ |
| `fetch`      | Native Fetch   | API client on the Fetch API: base URL, timeout, cancellation, normalized errors | —              | —                                               | conflicts: `axios` |
| `axios`      | Axios          | API client on Axios: base URL, timeout, cancellation, normalized errors         | `axios@1.21.1` | —                                               | conflicts: `fetch` |
| `orval`      | Orval          | Typed API functions generated from a local OpenAPI spec                         | `orval@8.49.0` | `tanstack-query`, `msw`, one of `fetch`/`axios` | —                  |
| `vite-proxy` | Vite dev proxy | Proxy an API prefix to a local backend during development                       | —              | —                                               | —                  |

## Forms and tables

| Id                   | Name                | Description                              | Packages                      | Requires                 | Limits |
| -------------------- | ------------------- | ---------------------------------------- | ----------------------------- | ------------------------ | ------ |
| `react-hook-form`    | React Hook Form     | Form state management                    | `react-hook-form@7.92.0`      | —                        | —      |
| `zod`                | Zod                 | Schema validation                        | `zod@4.6.7`                   | —                        | —      |
| `hookform-resolvers` | Hook Form Resolvers | Zod schemas as React Hook Form resolvers | `@hookform/resolvers@7.0.8`   | `react-hook-form`, `zod` | —      |
| `tanstack-table`     | TanStack Table      | Headless data tables                     | `@tanstack/react-table@9.3.1` | —                        | —      |

## Testing

| Id                | Name                  | Description                                                                       | Packages                                                                                                                                                                                                                                                                                 | Requires                         | Limits |
| ----------------- | --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| `vitest`          | Vitest                | Unit and component tests in jsdom                                                 | `vitest@5.1.1`<br>`jsdom@31.0.1`                                                                                                                                                                                                                                                         | —                                | —      |
| `testing-library` | React Testing Library | Component testing with jest-dom matchers and user-event                           | `@testing-library/react@16.3.3`<br>`@testing-library/dom@10.4.2`<br>`@testing-library/jest-dom@8.0.0`<br>`@testing-library/user-event@14.6.13`                                                                                                                                           | `vitest`                         | —      |
| `msw`             | MSW                   | Local API mocks for tests and development                                         | `msw@3.0.7`                                                                                                                                                                                                                                                                              | `vitest`, one of `fetch`/`axios` | —      |
| `storybook`       | Storybook             | Design-system workshop: stories, docs, a11y checks and story tests in the browser | `storybook@10.6.8`<br>`@storybook/react-vite@10.6.8`<br>`@storybook/addon-docs@10.6.8`<br>`@storybook/addon-a11y@10.6.8`<br>`@storybook/addon-themes@10.6.8`<br>`@storybook/addon-vitest@10.6.8`<br>`@vitest/browser@5.1.1`<br>`@vitest/browser-playwright@5.1.1`<br>`playwright@1.65.1` | `shadcn`, `vitest`               | —      |
| `playwright`      | Playwright            | End-to-end smoke tests against the production preview                             | `@playwright/test@1.65.1`                                                                                                                                                                                                                                                                | —                                | —      |

## Code quality

| Id                  | Name                         | Description                                                             | Packages                                                                                                                                                                                                                                                | Requires                            | Limits |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| `eslint`            | ESLint                       | ESLint flat config with TypeScript, React Hooks and React Refresh rules | `eslint@10.15.0`<br>`@eslint/js@10.0.1`<br>`typescript-eslint@8.74.0`<br>`eslint-plugin-react-hooks@7.1.1`<br>`eslint-plugin-react-refresh@0.5.8`<br>`globals@17.14.0`<br>`eslint-plugin-boundaries@7.4.4`<br>`eslint-import-resolver-typescript@4.4.5` | —                                   | —      |
| `eslint-query`      | TanStack Query ESLint Plugin | Lint rules for TanStack Query                                           | `@tanstack/eslint-plugin-query@5.108.4`                                                                                                                                                                                                                 | `eslint`, `tanstack-query`          | —      |
| `prettier`          | Prettier                     | Code formatting                                                         | `prettier@3.10.1`                                                                                                                                                                                                                                       | —                                   | —      |
| `prettier-tailwind` | Tailwind CSS Prettier Plugin | Sorts Tailwind classes                                                  | `prettier-plugin-tailwindcss@0.8.1`                                                                                                                                                                                                                     | `prettier`, `tailwind`              | —      |
| `husky`             | Husky                        | Git hooks                                                               | `husky@9.1.7`                                                                                                                                                                                                                                           | —                                   | —      |
| `lint-staged`       | lint-staged                  | Lint and format staged files in the pre-commit hook                     | `lint-staged@17.6.2`                                                                                                                                                                                                                                    | `husky`, one of `eslint`/`prettier` | —      |

## Infrastructure

| Id               | Name           | Description                                                    | Packages | Requires         | Limits                                                   |
| ---------------- | -------------- | -------------------------------------------------------------- | -------- | ---------------- | -------------------------------------------------------- |
| `docker`         | Docker + Nginx | Multi-stage image serving the build with an unprivileged Nginx | —        | —                | modes: standalone, monorepo; package managers: pnpm, npm |
| `github-actions` | GitHub Actions | CI: install, typecheck, lint, test, build                      | —        | —                | package managers: pnpm, npm                              |
| `codeql`         | CodeQL         | GitHub code scanning workflow                                  | —        | `github-actions` | —                                                        |

## AI development

| Id          | Name      | Description                     | Packages | Requires | Limits |
| ----------- | --------- | ------------------------------- | -------- | -------- | ------ |
| `claude-md` | CLAUDE.md | Project rules for Claude Code   | —        | —        | —      |
| `agents-md` | AGENTS.md | Project rules for coding agents | —        | —        | —      |

## Application

| Id               | Name                   | Description                                                                            | Packages       | Requires                                                                                                                                                  | Limits |
| ---------------- | ---------------------- | -------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `env-validation` | Environment validation | Validate VITE_ environment variables with Zod at startup                               | —              | `zod`                                                                                                                                                     | —      |
| `error-boundary` | Error Boundary         | Top-level error boundary with a recovery screen                                        | —              | —                                                                                                                                                         | —      |
| `admin-layout`   | Admin layout           | Sidebar, header, dashboard, data table, dialogs, toasts and empty/error/loading states | `sonner@2.0.8` | `shadcn`, `theme`, `zustand`, `tanstack-table`, `tanstack-query`, `react-hook-form`, `zod`, `hookform-resolvers`, one of `react-router`/`tanstack-router` | —      |

## Workspace packages

| Id           | Name            | Description                             | Packages | Requires | Limits          |
| ------------ | --------------- | --------------------------------------- | -------- | -------- | --------------- |
| `pkg-shared` | packages/shared | Shared runtime utilities (browser-safe) | —        | —        | modes: monorepo |
| `pkg-types`  | packages/types  | Shared TypeScript types                 | —        | —        | modes: monorepo |
| `pkg-ui`     | packages/ui     | Shared React UI components              | —        | —        | modes: monorepo |

When `shadcn` is selected, `@base-ui/react` or `radix-ui` is added according to `--ui`.

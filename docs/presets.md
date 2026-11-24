# Presets

A preset is a starting feature list. Any change to it (`--features +x,-y` or the Customize prompt) makes the result `custom`; a list identical to a preset keeps that preset's name. Required features are added automatically.

## Minimal (`minimal`)

React, Vite, TypeScript and ESLint.

- `eslint`

## Standard (`standard`)

A production-ready SPA stack (recommended).

- `tailwind`
- `lucide`
- `shadcn`
- `theme`
- `tanstack-query`
- `tanstack-query-devtools`
- `zustand`
- `react-router`
- `axios`
- `react-hook-form`
- `zod`
- `hookform-resolvers`
- `vitest`
- `testing-library`
- `eslint`
- `prettier`
- `claude-md`
- `agents-md`

## Admin (`admin`)

Standard plus an admin dashboard layout and data table.

- `tailwind`
- `lucide`
- `shadcn`
- `theme`
- `tanstack-query`
- `tanstack-query-devtools`
- `zustand`
- `react-router`
- `axios`
- `react-hook-form`
- `zod`
- `hookform-resolvers`
- `vitest`
- `testing-library`
- `eslint`
- `prettier`
- `claude-md`
- `agents-md`
- `tanstack-table`
- `admin-layout`

## Enterprise (`enterprise`)

Admin plus Orval, MSW, Playwright, Storybook, Docker, CI and CodeQL.

- `tailwind`
- `lucide`
- `shadcn`
- `theme`
- `tanstack-query`
- `tanstack-query-devtools`
- `zustand`
- `react-router`
- `axios`
- `react-hook-form`
- `zod`
- `hookform-resolvers`
- `vitest`
- `testing-library`
- `eslint`
- `prettier`
- `claude-md`
- `agents-md`
- `tanstack-table`
- `admin-layout`
- `orval`
- `msw`
- `playwright`
- `storybook`
- `docker`
- `github-actions`
- `codeql`
- `env-validation`
- `error-boundary`

## Custom (`custom`)

Start from Standard and pick features yourself.

- `tailwind`
- `lucide`
- `shadcn`
- `theme`
- `tanstack-query`
- `tanstack-query-devtools`
- `zustand`
- `react-router`
- `axios`
- `react-hook-form`
- `zod`
- `hookform-resolvers`
- `vitest`
- `testing-library`
- `eslint`
- `prettier`
- `claude-md`
- `agents-md`

## Example code

Standard and above include examples unless `--no-examples` is given. Examples are pages, so they need a router: with `--router none` none are generated. Each example is a page slice (see [architecture/frontend-architecture.md](architecture/frontend-architecture.md)):

| Example       | Path                        | Shows                                                                                                                      |
| ------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Server state  | `src/pages/todos-example`   | TanStack Query: query key factory, loading/error/empty states with retry, mutations, cache invalidation, filter in the URL |
| Forms         | `src/pages/sign-up-example` | React Hook Form + Zod: field errors, accessible messages, server-side errors with `setError`                               |
| Client state  | `src/pages/counter-example` | Zustand: selectors, `persist` with `partialize` (only the step preference is stored)                                       |
| Users (Admin) | `src/pages/users`           | TanStack Table v9: search, sorting, pagination, loading/error/empty states; dialog form; toast                             |

The examples use an in-memory API so they work without a backend; with MSW (Enterprise) the todos example calls `/api` through the generated Orval client (or the API client without Orval) and MSW answers. Deleting an example slice and its route does not break providers, the router, the API client or the theme.

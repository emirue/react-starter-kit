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

Admin plus Orval, MSW, Playwright, Docker, CI and CodeQL.

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

Standard and above include examples unless `--no-examples` is given:

| Example       | Path                   | Shows                                                                                                         |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Server state  | `src/features/todos`   | TanStack Query: query key factory, loading, error and retry, mutations, cache invalidation, URL search params |
| Forms         | `src/features/sign-up` | React Hook Form + Zod: field errors, accessible messages, server-side errors with `setError`                  |
| Client state  | `src/features/counter` | Zustand: selectors, `persist` with `partialize` (only the step preference is stored)                          |
| Users (Admin) | `src/features/users`   | TanStack Table v9: search, sorting, pagination, empty/loading/error states; dialog form; toast                |

The examples use an in-memory API so they work without a backend; with MSW (Enterprise) the same code calls `/api` through the API client and MSW answers. Deleting an example folder and its route does not break providers, the router, the API client or the theme.

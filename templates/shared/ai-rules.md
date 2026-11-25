## Project overview

{{appName}} is a React single-page application built with Vite and TypeScript.
<!-- @if workspace -->
It is one application inside a {{pm}} workspace; this file covers `{{appDir}}` only.
<!-- @endif -->

## Technology stack

{{stackMarkdown}}

## Architecture and directories

The code follows Feature-Sliced Design (layers, slices, public APIs). Each layer may import only the layers below it: `app` → `pages` → `features` → `entities` → `shared`.
<!-- @if eslint -->
`{{pmRun}} lint` enforces this with `eslint-plugin-boundaries`; fix the import, never disable the rule.
<!-- @endif -->

- `src/main.tsx` mounts the app. `src/index.css` holds global styles and the design tokens.
- `src/app/` composes the app: `app.tsx` and, when present, `providers.tsx` (every app-wide provider, once).
<!-- @if react-router -->
- `src/app/router.tsx` defines the routes (React Router data mode, pages imported lazily from their `index.ts`); `src/app/route-error.tsx` is the route error boundary.
<!-- @endif -->
<!-- @if tanstack-router -->
- `src/app/router.tsx` creates the router; `defaultErrorComponent` keeps the layout when a page fails.
<!-- @endif -->
<!-- @if router -->
- `src/app/layouts/` holds layouts for the whole app or a route subtree.
<!-- @endif -->
<!-- @if admin-layout -->
- `src/app/model/` holds app-shell state (the sidebar).
<!-- @endif -->
<!-- @if tanstack-router -->
- `src/routes/` holds file-based routes. Route files stay thin: they bind a page component and search validation exported by a page slice. `src/routeTree.gen.ts` is generated: never edit it by hand.
<!-- @endif -->
- `src/pages/<page>/` is one slice per screen: `ui/`, `api/` (requests and query options only this page uses), `model/` (types, schemas, search params, page state) and `index.ts`, the slice's public API.
<!-- @if theme -->
- `src/features/<action>/` holds user actions used in more than one place (e.g. `switch-theme`), with the same segments and an `index.ts`.
<!-- @else -->
- `src/features/<action>/` holds user actions used in more than one place, with the same segments and an `index.ts`.
<!-- @endif -->
- `src/entities/<domain>/` is created when two pages need the same domain data (types, schemas, read API, query options).
- `src/shared/` holds domain-free code: `ui/` (the design system), `api/` (HTTP client, `ApiError`, QueryClient defaults, generated client, as selected), `lib/` (one focused helper per module), `config/`.
<!-- @if msw -->
- `src/mocks/` (MSW) and `src/test/` (test setup and helpers) are infrastructure outside the layers.
<!-- @endif -->

Public API rules:

- Import another slice only through its `index.ts`: `import { UsersPage } from "@/pages/users"`. Never `@/pages/users/ui/users-table`.
- Inside a slice use relative imports. Between slices use the `@/` alias.
- `shared/ui` and `shared/lib` are imported per module: `@/shared/ui/button`, `@/shared/lib/utils`.
- `index.ts` lists named exports explicitly; do not use `export *`.

Where new code goes:

1. Start in the page slice that needs it.
2. When a second page needs a user action, move it to `src/features/<action>/`; when it needs domain data, move it to `src/entities/<domain>/`. Export it from the new slice's `index.ts` and update the imports.
3. Code without domain knowledge goes to `src/shared/`.
<!-- @if shadcn -->
4. Add shadcn/ui components with `{{pmDlx}} shadcn@latest add <name>`; `components.json` puts them in `src/shared/ui`.
<!-- @endif -->

Reference implementations (copy their shape for new code of the same kind; if you delete one, remove its line here):

<!-- @if example-pages && tanstack-query -->
- Page with server data: `src/pages/todos-example` (`api/` key factory and query options, URL filter in `model/`, loading/error/empty states).
<!-- @endif -->
<!-- @if example-pages && forms-example -->
- Page with a form: `src/pages/sign-up-example` (Zod schema in `model/`, field and server errors).
<!-- @endif -->
<!-- @if admin-layout && examples -->
- Page with a table and a dialog: `src/pages/users` (TanStack Table, create mutation with invalidation).
<!-- @endif -->
<!-- @if theme -->
- Feature used in several places: `src/features/switch-theme` (public API in `index.ts`).
<!-- @endif -->
<!-- @if shadcn || ui-primitives -->
- Shared components: `src/shared/ui/state.tsx` and `src/shared/ui/page-header.tsx`.
<!-- @endif -->
<!-- @if api-client -->
- HTTP client: `src/shared/api/http-client.ts` (base URL, timeout, cancellation, `ApiError`).
<!-- @endif -->
- Entities: none yet. Create `src/entities/<domain>/` when a second page needs the same domain data.

## Conventions

- File names: `kebab-case.ts(x)`. Components: `PascalCase`. Hooks: `useSomething`.
- `src/shared/config/env.ts` is the only place that reads `import.meta.env`.
- TypeScript strict mode is on. Do not use `any`, `@ts-ignore` or blanket `eslint-disable` to silence errors; fix the cause.
- Keep components small and accessible: semantic HTML, labels for inputs, visible focus, keyboard support.
<!-- @if tailwind -->

## Design system and responsive rules

- Style with Tailwind CSS utilities and the semantic tokens in `src/index.css`: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border`, `text-destructive`. Do not use raw palette classes (`bg-gray-500`) or hex colors.
- Build screens from `src/shared/ui`: `PageHeader` for the page title (one `h1` per page), `LoadingState` / `ErrorState` / `EmptyState` for every data view, `Card`, `Button`, `Input` + `Label`.
- Mobile first. Pages must not scroll horizontally at 375 px: stack on small screens (`flex-col sm:flex-row`), wrap action rows (`flex-wrap`), let wide tables scroll in their own container.
- Accessibility: one `main` landmark reached by the "Skip to content" link, navigation inside a labelled `nav`, a visible label for every input, text contrast of at least 4.5:1 in both themes.
<!-- @if storybook -->
- When you add or change a reusable component in `src/shared/ui` or `src/features`, add or update its story next to it (`*.stories.tsx`). `{{pmRun}} test:storybook` renders each story in Chromium and fails on accessibility violations. `src/shared/ui/design-tokens.mdx` documents the tokens.
<!-- @endif -->
<!-- @endif -->

## State management rules

<!-- @if tanstack-query -->
- Server state belongs to TanStack Query. Build keys with a key factory next to the requests (`api/*-queries.ts` in the slice) and invalidate after mutations.
<!-- @if zustand -->
- Do not copy server data into Zustand or React state.
<!-- @else -->
- Do not copy server data into React state.
<!-- @endif -->
<!-- @endif -->
<!-- @if zustand -->
- Zustand is for client state shared across components. Read with selectors. Persist only non-sensitive preferences.
<!-- @endif -->
<!-- @if react-hook-form -->
- Form state belongs to React Hook Form, not to global stores.
<!-- @endif -->
- Local UI state stays in components.

<!-- @if api-client -->
## API integration rules

<!-- @if orval -->
- Call the backend only through `src/shared/api/http-client.ts` or the generated client in `src/shared/api/generated`. Both reject with `ApiError` (`kind`, `status`, `details`) from `src/shared/api/api-error.ts`.
<!-- @else -->
- Call the backend only through `src/shared/api/http-client.ts`. It rejects with `ApiError` (`kind`, `status`, `details`) from `src/shared/api/api-error.ts`.
<!-- @endif -->
- Pass the `signal` TanStack Query provides so requests are cancelled.
- The base URL comes from `VITE_API_BASE_URL`. Do not hard-code hosts.
- Authentication: plug headers in with `setAuthHeadersProvider`. Do not invent token refresh or retry logic without the backend contract.
<!-- @if orval -->
- Regenerate the typed client with `{{pmRun}} api:generate` after changing `openapi/openapi.yaml`. Never edit `src/shared/api/generated` by hand; wrap the generated functions in the page's `api/` segment.
<!-- @endif -->

<!-- @endif -->
## Security requirements

- Every `VITE_*` variable is public. Never put secrets, tokens or private keys in the frontend or in `.env*` files that are committed.
- Do not store tokens, passwords or personal data in `localStorage`.
- Do not render untrusted HTML (`dangerouslySetInnerHTML`) without sanitising it.

## Rules for AI agents

1. Check whether a new library is needed before adding one, and do not add libraries that duplicate an existing one's role.
2. Confirm APIs in the official documentation (or Context7 MCP) for the installed version; do not guess from older versions.
3. Run the validation commands below before finishing, and report any you could not run. Never report unrun checks as passing.
<!-- @if workspace -->
4. Change only this application. Do not modify other workspace applications or backend code unless asked.
<!-- @endif -->

## Validation commands

```bash
{{pmRun}} typecheck
<!-- @if eslint -->
{{pmRun}} lint
<!-- @endif -->
<!-- @if prettier -->
{{pmRun}} format:check
<!-- @endif -->
<!-- @if vitest -->
{{pmRun}} test:run
<!-- @endif -->
<!-- @if playwright -->
{{pmRun}} test:e2e
<!-- @endif -->
<!-- @if storybook -->
{{pmRun}} test:storybook
<!-- @endif -->
{{pmRun}} build
```

## Definition of done

- The validation commands above pass.
- New behaviour has tests.
- No unused code, dependencies or debug output are left behind.

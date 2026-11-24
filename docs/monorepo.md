# Monorepos

## New monorepo

```bash
pnpm create produx-app@latest my-project --mode monorepo --app-name web --features +pkg-shared,+pkg-types,+pkg-ui
```

```text
my-project/
├── apps/web/                 the React app (its own package.json, tsconfig, AGENTS.md)
├── packages/shared/          browser-safe helpers (@my-project/shared)      ← +pkg-shared
├── packages/types/           types shared with TS backends (@my-project/types) ← +pkg-types
├── packages/ui/              shared React components (@my-project/ui)     ← +pkg-ui
├── package.json              packageManager, root scripts, turbo
├── pnpm-workspace.yaml       apps/*, packages/*
├── pnpm-lock.yaml            the only lockfile
├── turbo.json                ← unless --no-turbo
└── AGENTS.md, CLAUDE.md, README.md
```

- The lockfile and package-manager settings live at the root; apps and packages declare their own direct dependencies.
- Shared packages build with `tsc -b` to `dist/` with type declarations and are consumed through `exports` and `workspace:*`, so TypeScript, Vite, Vitest and Node.js resolve them the same way. Path aliases are not used to fake package resolution.
- `packages/shared` and `packages/types` have no DOM or Node.js types; importing `node:*` there fails the type check, which keeps server-only code out of the frontend.
- The app scans `packages/ui/src` with Tailwind's `@source`, so classes used in shared components are generated.
- shadcn/ui components stay in the app (`apps/web/src/components/ui`); `packages/ui` holds plain React components.

Root commands:

| Command          | With Turborepo                                      | Without                                            |
| ---------------- | --------------------------------------------------- | -------------------------------------------------- |
| `pnpm dev`       | `turbo run dev` (builds dependencies first)         | builds packages, then `pnpm -r --parallel run dev` |
| `pnpm build`     | `turbo run build` (`dependsOn: ["^build"]`, cached) | `pnpm -r run build` (dependency order)             |
| `pnpm typecheck` | `turbo run typecheck`                               | `pnpm -r run typecheck`                            |
| `pnpm lint`      | `turbo run lint`                                    | `pnpm -r run lint`                                 |
| `pnpm test`      | `turbo run test:run`                                | builds packages, then `pnpm -r run test:run`       |

One app: `pnpm --filter web dev`, `pnpm --filter web build`. Turborepo runs with the local cache only; remote caching is optional and not configured.

## Existing workspace

Run inside the workspace (or pass `--workspace-root`):

```bash
pnpm create produx-app@latest admin --mode existing-workspace --preset standard
```

Detected: root, package manager and version, workspace globs, lockfiles, Turborepo, git root, existing packages, root lifecycle scripts, overrides/resolutions, catalogs. Several lockfiles without a `packageManager` field stop the CLI instead of guessing.

What the CLI changes:

| Change                                                                                                                                                                                                                                                   | When                                       | Approval                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Creates `<app-dir>/` with the app, including its own `.gitignore`, `AGENTS.md`, `CLAUDE.md`                                                                                                                                                              | always                                     | —                                                  |
| Adds `<app-dir>` to `pnpm-workspace.yaml`                                                                                                                                                                                                                | the app dir matches no glob                | interactive confirm or `--allow-workspace-changes` |
| Adds `allowBuilds: esbuild: true` to `pnpm-workspace.yaml`                                                                                                                                                                                               | Orval selected and esbuild not decided yet | same                                               |
| Runs `pnpm install` at the root, which executes workspace code: root lifecycle scripts (`pnpm:devPreinstall`, `preinstall`, `install`, `postinstall`, `preprepare`, `prepare`, `postprepare`), `.pnpmfile.cjs` and install scripts of workspace packages | always, unless `--no-install`              | same                                               |
| Updates the root lockfile                                                                                                                                                                                                                                | install                                    | shown in the review                                |

Never changed: other apps and packages, backend code, root `package.json`, existing `CLAUDE.md`/`AGENTS.md`, CI, Docker and TypeScript/ESLint configuration. `.github/` and `.husky/` files are not written in this mode. No nested git repository and no app-level lockfile are created. Overrides that pin a package the app uses are reported, because the app will then not get the verified version.

If a later step fails, the files stay for inspection and the CLI prints what it created and modified. Ctrl+C rolls everything back, including the lockfile.

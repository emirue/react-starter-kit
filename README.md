# create-produx-app

An interactive CLI that creates React + Vite + TypeScript projects with a verified, ready-to-use stack: standalone apps, new pnpm monorepos, or a new app inside an existing monorepo.

It is not a template copier. Each project is assembled from feature modules, installed, and then validated (type check, lint, unit tests, production build) before the CLI reports success.

> **Status: 0.1.0, not published to npm yet.** The `npm create produx-app` commands below work once the package is published. Until then, run it from a clone or a packed tarball (see [Running before publication](#running-before-publication)).

## Quick start

```bash
pnpm create produx-app@latest my-app
# or
npm create produx-app@latest my-app
npx create-produx-app@latest my-app
pnpm dlx create-produx-app@latest my-app
```

Answer the prompts (or press Enter to accept the Standard preset), then:

```bash
cd my-app
pnpm dev
```

Non-interactive:

```bash
pnpm create produx-app@latest my-app --mode standalone --preset standard --package-manager pnpm --yes
```

## What you get

| Mode                                               | Command                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Standalone app                                     | `pnpm create produx-app@latest my-app`                                                   |
| New monorepo (pnpm workspaces, optional Turborepo) | `pnpm create produx-app@latest my-project --mode monorepo --app-name web`                |
| Add an app to an existing workspace                | `pnpm create produx-app@latest web --mode existing-workspace` (run inside the workspace) |

### Presets

|                                                                                                | Minimal | Standard (default) | Admin | Enterprise |
| ---------------------------------------------------------------------------------------------- | :-----: | :----------------: | :---: | :--------: |
| React 19, Vite 8, TypeScript 6 (strict), `@/` alias                                            |    ✓    |         ✓          |   ✓   |     ✓      |
| ESLint 10 (flat config, React Hooks, React Refresh)                                            |    ✓    |         ✓          |   ✓   |     ✓      |
| Tailwind CSS 4, shadcn/ui (Base UI or Radix), Lucide, light/dark/system theme                  |         |         ✓          |   ✓   |     ✓      |
| TanStack Query + Devtools, Zustand                                                             |         |         ✓          |   ✓   |     ✓      |
| React Router 8 (or TanStack Router), Axios (or Fetch) API client                               |         |         ✓          |   ✓   |     ✓      |
| React Hook Form + Zod + resolvers                                                              |         |         ✓          |   ✓   |     ✓      |
| Vitest + React Testing Library, Prettier, CLAUDE.md, AGENTS.md                                 |         |         ✓          |   ✓   |     ✓      |
| Admin layout: sidebar, header, dashboard, data table (TanStack Table), dialog, toasts          |         |                    |   ✓   |     ✓      |
| Orval, MSW, Playwright, Docker + Nginx, GitHub Actions, CodeQL, env validation, error boundary |         |                    |       |     ✓      |

`Custom` starts from Standard and lets you pick features. Details: [docs/presets.md](docs/presets.md) and [docs/features.md](docs/features.md).

### Generated standalone project (Standard)

```text
my-app/
├── public/
├── src/
│   ├── app/            providers.tsx, router.tsx
│   ├── components/     theme/, ui/ (shadcn/ui)
│   ├── config/         env.ts (the only reader of import.meta.env)
│   ├── features/       todos/, sign-up/, counter/ (examples; delete freely)
│   ├── layouts/
│   ├── lib/            api-client.ts, api-error.ts, query-client.ts, utils.ts
│   ├── pages/
│   ├── test/setup.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── AGENTS.md, CLAUDE.md
├── components.json
├── eslint.config.js
├── vite.config.ts
└── tsconfig*.json
```

Only selected features produce files and dependencies; the validation suite checks that unselected packages never appear.

## CLI options

| Option                                     | Description                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `[directory]`                              | Project directory (standalone, new monorepo) or app name (existing workspace)                             |
| `--mode <mode>`                            | `standalone` \| `monorepo` \| `existing-workspace`                                                        |
| `--preset <preset>`                        | `minimal` \| `standard` \| `admin` \| `enterprise` \| `custom`                                            |
| `--package-manager <pm>`                   | `pnpm` \| `npm` \| `yarn` \| `bun` (default: the one that launched the CLI, else pnpm)                    |
| `--features <list>`                        | `a,b,c` sets the exact list; `+a,-b` adjusts the preset                                                   |
| `--ui <base>`                              | shadcn/ui primitives: `base` (Base UI, default) \| `radix`                                                |
| `--router <router>`                        | `react-router` \| `tanstack-router` \| `none`                                                             |
| `--workspace-root <path>`                  | Existing workspace root (default: detected)                                                               |
| `--app-name <name>` / `--app-dir <path>`   | App package name / directory inside a workspace (default `apps/<name>`)                                   |
| `--turbo` / `--no-turbo`                   | Turborepo for a new monorepo (default: on)                                                                |
| `--config <file>` / `--save-config [file]` | Load / save a reusable `produx.config.json`                                                               |
| `--examples` / `--no-examples`             | Include example features (default) or a clean starter                                                     |
| `-y, --yes`                                | Never prompt; use defaults for anything not given                                                         |
| `--no-install`, `--no-git`, `--no-verify`  | Skip install (and therefore validation), git init, or validation                                          |
| `--dry-run`                                | Print the plan; write nothing, run nothing                                                                |
| `--allow-workspace-changes`                | Existing workspace only: approve the listed root-file changes and the install (which runs workspace code) |

Full reference, including conflicts that are rejected: [docs/cli-options.md](docs/cli-options.md).

## Reusing a configuration

```bash
pnpm create produx-app@latest first-app --preset admin --router tanstack-router --save-config team.json
pnpm create produx-app@latest second-app --config team.json --yes
```

Precedence: command-line options > config file > preset > defaults. The file contains no paths, names of your machine, tokens or secrets. See [docs/configuration.md](docs/configuration.md).

## Safety

- The target directory must be missing or empty; existing files are never overwritten.
- Files are written to a staging directory and moved into place. Ctrl+C rolls back what this run created or changed.
- In an existing workspace the CLI writes only inside the new app directory. Changing root files (for example adding the app to `pnpm-workspace.yaml`) and installing (which runs the workspace's own install scripts, `.pnpmfile.cjs` and its packages' install scripts) require interactive confirmation or `--allow-workspace-changes`; `--yes` alone never approves them. Use `--no-install` to add the app without running anything.
- External commands run with argument arrays, never through a shell.
- Package managers are never installed globally.

## System requirements

|                    | Node.js                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| The CLI            | `>=22.12.0`                                                                              |
| Generated projects | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` (set by jsdom 31, React Router 8, lint-staged 17) |

Recommended: the current Node.js LTS (26.x).

## Verified support

Everything below was run end to end (generate → install → type check → lint → unit tests → build, plus browser checks); see [docs/validation-report.md](docs/validation-report.md) for commands, exit codes and dates.

|                                                            | Status                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| macOS (arm64), Node.js 22.23.2 / 24.21.0 / 26.13.0         | PASS                                                                  |
| Linux, Windows                                             | NOT TESTED locally (CI matrix provided in `.github/workflows/ci.yml`) |
| pnpm 11.13.0: standalone, new monorepo, existing workspace | PASS                                                                  |
| npm 11, Bun 1.4.4, Yarn 1.22.22: standalone Standard       | PASS                                                                  |
| npm, Yarn, Bun: monorepo modes                             | Not supported in this release (pnpm only)                             |
| pnpm 12, Yarn 4                                            | NOT TESTED                                                            |
| GitHub Actions / CodeQL workflows                          | Generated and checked with actionlint; not executed on GitHub         |

## Backend integration

The CLI never generates a backend. Generated apps call APIs through one client (`src/lib/api-client.ts`, Fetch or Axios) with a configurable base URL, timeouts, cancellation and a single `ApiError` type, and can proxy `/api` to a local backend in development. Monorepos can share types with TypeScript backends (NestJS, Express) through `packages/types`; non-TypeScript backends (ASP.NET Core, ...) connect over HTTP and OpenAPI (Orval). See [docs/backend-integration.md](docs/backend-integration.md).

## Dependency version policy

Generated projects pin exact versions from [`src/config/dependency-versions.json`](src/config/dependency-versions.json), verified for this CLI release. The CLI never installs unverified `latest` versions. Updates go through Renovate and the validation matrix ([docs/releasing.md](docs/releasing.md)). Deliberate exceptions, such as TypeScript 6.0.x instead of 7, are explained in [docs/dependency-compatibility.md](docs/dependency-compatibility.md).

## Running before publication

```bash
git clone <this repository> && cd <it>
pnpm install && pnpm build
node dist/index.mjs my-app            # or: npm pack, then npx --package ./create-produx-app-0.1.0.tgz create-produx-app my-app
```

## Troubleshooting

| Symptom                                                              | Cause and fix                                                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_IGNORED_BUILDS`                                            | pnpm 11+ blocks dependency build scripts. Generated projects approve only what they need in `pnpm-workspace.yaml` → `allowBuilds`. |
| `pnpm-workspace.yaml` gains `minimumReleaseAgeExclude` after install | pnpm records packages published less than a day ago. Review and commit it, or reinstall later.                                     |
| `The engine "node" is incompatible` (Yarn)                           | Yarn 1 enforces `engines`; use a Node.js version from the table above.                                                             |
| `test:e2e` cannot find a browser                                     | Run `pnpm exec playwright install chromium` once (not done automatically: large download).                                         |
| `Generated projects need Node.js …` warning                          | Your Node.js is older than the generated project needs; switch versions before installing.                                         |

## Known limitations

- shadcn/ui ships the `nova` style only (Base UI and Radix); other shadcn presets are not offered yet.
- Monorepo modes are pnpm-only. Shared packages (`packages/shared`, `types`, `ui`) are created in new monorepos only.
- The shared UI package holds plain React components; shadcn/ui components stay app-local.
- Orval is supported in TanStack Query mode only.
- Docker images are supported for standalone apps and new monorepos with pnpm or npm.
- Windows and Linux have not been run locally.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

# Context7 and official-source references

Consolidated from four research notes: `docs/research/raw/A-cli.md`, `B-app.md`, `C-quality.md` and `D-infra.md`. Selected versions come from `src/config/dependency-versions.json` (generated projects) and the CLI's own `package.json` (CLI runtime and build). The raw notes keep the full measurement logs; this document keeps the essentials.

## About this research

- **Research date:** 2026-11-24.
- **Scope:** The research supported development of the `create-produx-app` CLI only. Generated projects never need Context7.
- **Context7 quota:** The free monthly quota of the Context7 MCP server ran out during research (`Monthly quota exceeded`). Following spec §3.4, the user was asked and explicitly approved continuing with official sources:
  - package READMEs and CHANGELOGs
  - installed `.d.ts` files
  - GitHub release notes
  - npm registry metadata
  - runs of the official scaffolds: `create-vite` 9.3.4 (`react-ts`), and `shadcn init -t vite` 4.23.0 for Base UI and Radix with preset `nova`
- **Version gaps:** Context7 often listed only older pinned versions than the selected ones. For example, Vite was listed at v8.3.5 while the registry had 8.3.8, and commander at v15.0.0 versus the selected 15.1.0. These gaps were covered from the installed packages.
- **Measurement environment:**
  - macOS, Node v24.14.0. Nothing was run on Node 26.
  - Node 24.14.0 is outside the engines range of jsdom 31 and npm 12.
  - The app-library type checks and the Orval type check ran on `tsc` 7.0.2, not the selected 6.0.3. The quality-tool checks used TypeScript 6.0.3.

### Verification labels

| Label              | Original labels in the raw notes                         | Meaning                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs-confirmed     | docs-confirmed                                           | Found in Context7 or official docs, consistent with the installed version                                                                                                                         |
| installed-verified | installed-verified; measured; tsc+build; source analysis | Confirmed from the exact installed version: `.d.ts`, source or a run. "tsc + build" means type check and bundle only, with no runtime. "Source reading" means the code was read but not executed. |
| from changelog     | changelog (gh); README/changelog; from release notes/API | Taken from a CHANGELOG, README, GitHub release notes or an API response                                                                                                                           |
| unconfirmed        | unconfirmed                                              | Not verified. Assumptions and inferences are also marked inline.                                                                                                                                  |

**Section layout:** each library section lists the same 11 fields in the same order. The short fields form a definition list, and "Selected version", "Documentation version" and "Research date" share one line.

## Key decisions derived from research

- **TypeScript 6.0.3, not 7.0.2.** typescript-eslint 8.74.0 peers `typescript >=4.8.4 <6.1.0`, and TypeScript 7.0.2 ships no classic JS compiler API (only `unstable/*` exports). The official shadcn Vite template also uses TypeScript `~6.0`.
- **`typecheck` uses `tsc -b`.** With a solution-style tsconfig (`files: []`), `tsc --noEmit` checked nothing and exited 0 on a type error. This was measured on the shadcn template.
- **pnpm 11+ requires build-script approval.** Dependency build scripts must be approved (`allowBuilds` in `pnpm-workspace.yaml`), or install fails with `ERR_PNPM_IGNORED_BUILDS`. Only esbuild, which orval pulls in, needed it. pnpm also writes `minimumReleaseAgeExclude` entries for packages published less than a day before install.
- **Node.js requirement for generated projects: `^22.22.2 || ^24.15.0 || >=26.0.0`.** This comes from the jsdom 31 engines field. react-router 8 needs `>=22.22.0` and lint-staged 17 needs `>=22.22.1`. The CLI itself needs `>=22.12.0` because of commander 15 and execa 10.
- **MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`** and removed its `postinstall` script.
- **shadcn 4.23.0** offers the presets `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera` and `rhea`, and the bases `base`, `radix` and `aria`. This release vendors `nova` for `base` and `radix` only.

### Node.js baseline

| Scope                         | Requirement                            | Driven by                                                                                |
| ----------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Generated projects            | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | jsdom 31.0.1 (strictest); react-router 8.5.2 `>=22.22.0`; lint-staged 17.6.2 `>=22.22.1` |
| CLI runtime (`engines.node`)  | `>=22.12.0`                            | commander 15.1.0; execa 10.2.1 `>=22`; @clack/prompts 1.9.0 `>= 20.12.0`                 |
| CLI build (contributors only) | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0` | tsdown 0.23.7 (devDependency); Node 25 unsupported                                       |

---

## Core (Vite, React, TypeScript)

These were checked by running the official scaffolds rather than from the research notes.

### Vite and @vitejs/plugin-react

| Field                   | Value                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Context7 library ID     | `/vitejs/vite` (resolved at the start of research; listed versions included v8.3.5, not the selected 8.3.8; quota ran out before a version-pinned query)                                                                                                                                                                                                                             |
| Selected version        | vite 8.3.8, @vitejs/plugin-react 6.3.0                                                                                                                                                                                                                                                                                                                                               |
| Documentation version   | v8.3.5 listing in Context7; `create-vite` 9.3.4 output                                                                                                                                                                                                                                                                                                                               |
| Research date           | 2026-11-24                                                                                                                                                                                                                                                                                                                                                                           |
| Query topic             | React + TypeScript project setup and plugin configuration; `resolve.alias`                                                                                                                                                                                                                                                                                                           |
| Official documentation  | https://vite.dev/guide/                                                                                                                                                                                                                                                                                                                                                              |
| Confirmed configuration | `create-vite --template react-ts` 9.3.4: `plugins: [react()]`, `tsconfig.json` references `tsconfig.app.json` + `tsconfig.node.json`, `types: ["vite/client"]`, `moduleResolution: "bundler"`, `"type": "module"`. The shadcn Vite template adds `resolve.alias` `@` → `resolve(import.meta.dirname, "./src")` (use `import.meta.dirname`, not `__dirname`) and the Tailwind plugin. |
| Deprecated / breaking   | Vite 8 bundles with Rolldown; `create-vite` now scaffolds oxlint instead of ESLint (this project keeps ESLint as the spec requires).                                                                                                                                                                                                                                                 |
| Compatibility           | engines `^20.19.0 \|\| >=22.12.0`; @vitejs/plugin-react 6 peers `vite ^8`; vitest 5, @tailwindcss/vite 4.3, @tanstack/router-plugin accept Vite 8.                                                                                                                                                                                                                                   |
| Verification status     | installed-verified (scaffold output, builds in every validation scenario)                                                                                                                                                                                                                                                                                                            |

### React and React DOM

| Field                   | Value                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Context7 library ID     | not queried (quota exceeded)                                                                  |
| Selected version        | react 19.3.1, react-dom 19.3.1, @types/react 19.3.0, @types/react-dom 19.3.0                  |
| Documentation version   | npm registry metadata; `create-vite` output                                                   |
| Research date           | 2026-11-24                                                                                    |
| Query topic             | Versions, peers of dependent libraries                                                        |
| Official documentation  | https://react.dev                                                                             |
| Confirmed configuration | `createRoot(container).render(<StrictMode>…</StrictMode>)` from `react-dom/client` (scaffold) |
| Deprecated / breaking   | none relevant for 19.3                                                                        |
| Compatibility           | react-router 8 peers `react >=19.2.7`; all other selected libraries accept React 19           |
| Verification status     | installed-verified                                                                            |

### TypeScript

| Field                   | Value                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context7 library ID     | not queried (quota exceeded)                                                                                                                                                                                                                                                                          |
| Selected version        | 6.0.3 (latest stable is 7.0.2)                                                                                                                                                                                                                                                                        |
| Documentation version   | npm registry; package `exports`; scaffolds                                                                                                                                                                                                                                                            |
| Research date           | 2026-11-24                                                                                                                                                                                                                                                                                            |
| Query topic             | TypeScript 7 compatibility with typescript-eslint; tsconfig for TS 6                                                                                                                                                                                                                                  |
| Official documentation  | https://www.typescriptlang.org/docs/                                                                                                                                                                                                                                                                  |
| Confirmed configuration | `create-vite` uses `typescript ~7.0.2`; the shadcn Vite template uses `~6.0.2`. TS 7.0.2's package exports only `version.cjs` and `unstable/*` APIs, so tools that need the compiler API (typescript-eslint) cannot use it. `tsc --noEmit` on a solution-style tsconfig checks nothing; use `tsc -b`. |
| Deprecated / breaking   | TS 6: `baseUrl`-based setups fail (TS5101); `rootDir` must be explicit with `outDir` in some layouts (TS5011).                                                                                                                                                                                        |
| Compatibility           | typescript-eslint 8.74.0 peers `>=4.8.4 <6.1.0` → 6.0.3 is the newest version all peers accept                                                                                                                                                                                                        |
| Verification status     | installed-verified                                                                                                                                                                                                                                                                                    |

## CLI

### @clack/prompts

- **Library name:** `@clack/prompts` (depends on `@clack/core` 1.6.0)
- **Context7 library ID:** `/bombshell-dev/clack`, not version-pinned. The only listed version was `__branch__v0` (0.x), so the unpinned ID was used; it returns `_autodocs/` from `main`.
- **Selected version:** 1.9.0 (CLI dependency) · **Documentation version:** not reported (`main` branch) · **Research date:** 2026-11-24
- **Query topic:** intro/outro/cancel, text/select/multiselect/confirm, group, isCancel, spinner stop and cancel, v1 breaking changes
- **Official documentation URL:** https://bomb.sh/docs/clack/packages/prompts/

**Confirmed configuration**

```ts
const name = await text({ message: "Project name?", placeholder: "my-app", defaultValue: "my-app" })
if (isCancel(name)) {
  cancel("Operation cancelled.")
  process.exit(1)
}
const s = spinner()
s.start("Copying template")
s.stop("Copied") // or s.error() / s.cancel()
```

- Prompts resolve `CANCEL_SYMBOL` on Ctrl+C, Esc or `signal` abort, and never throw, so check every result with `isCancel()`. `placeholder` is only a hint; `defaultValue` is what an empty input returns.
- **`group()` pitfall:** without `onCancel`, the symbol lands in the result object, which the return type hides, and the next prompt still runs. An `onCancel` that only returns writes `"canceled"` into the field and continues. To stop, call `cancel()` and `process.exit()` inside `onCancel`, or throw.
- **Spinner Ctrl+C pitfall** (macOS pty, Node 24.14): the process exited 0 without calling `onCancel`, because `@clack/core` `block()` calls `process.exit(0)` in raw mode. Context7 `_autodocs/errors.md` describes exit code 1 plus `onCancel`, which probably applies to a real SIGINT (assumption). Cleanup code may not run (assumption).

**Deprecated APIs / breaking changes**

- 1.0.0: ESM only. spinner `stop(msg, code)` was split into `stop()`, `cancel()` and `error()`. `placeholder` became a hint, and `suggestion` was removed.
- Later releases: 1.5.0 lets `validate` take a Standard Schema (zod 4 not measured); 1.6.0 stops dimming `note()`; 1.8.0 exports `CANCEL_SYMBOL` and adds async validate; 1.9.0 adds a spinner accessible mode.

**Compatibility considerations:** engines `>= 20.12.0`. In CI the spinner prints line by line (`isCI()`). Tests can inject `input`/`output` streams or pass a pre-aborted `signal`. Linux, Windows and external `kill -INT` were not tested.

**Verification status:** API signatures are docs-confirmed and installed-verified (`dist/index.d.mts`). `group` and spinner behavior are installed-verified (measured). Breaking changes are from changelog.

### commander

- **Library name:** `commander`
- **Context7 library ID:** `/tj/commander.js/v15.0.0`, version-pinned but older (15.1.0 not listed)
- **Selected version:** 15.1.0 (CLI dependency) · **Documentation version:** v15.0.0 (`Readme.md`) · **Research date:** 2026-11-24
- **Query topic:** Negatable options and `--x`/`--no-x` defaults. `.version`, `.exitOverride`, `parse(argv, {from})` and unknown options were checked through `.d.ts` and measurement.
- **Official documentation URL:** https://github.com/tj/commander.js#readme

**Confirmed configuration**

```ts
const program = new Command()
  .name("create-produx-app")
  .version("0.0.0")
  .argument("[project-dir]")
  .option("--no-install", "skip install") // lone --no-*: default true
  .option("--turbo", "use turbo")
  .option("--no-turbo", "no turbo") // pair: no default (undefined)
  .option("-t, --template <name>", "template", "default")
  .exitOverride() // throw CommanderError instead of exiting
program.parse(argv, { from: "user" })
```

- **Defaults** (measured): no arguments gives `{"template":"default","install":true}` with no `turbo` key. With `--turbo --no-turbo` the last flag wins. `getOptionValueSource()` returns `cli` for flags given on the command line.
- **Errors under `exitOverride`:** an unknown option throws `commander.unknownOption` (exit 1, with a "Did you mean --no-install?" hint), and an extra positional argument throws `commander.excessArguments` (exit 1). `--version` and `--help` throw `commander.version` and `commander.helpDisplayed` (exit 0).
- `configureOutput({ writeOut, writeErr })` silences output in tests.

**Deprecated APIs / breaking changes**

- 15.0.0 (2026-05-29):
  - ESM only (`commander/esm.mjs` removed); requires Node ≥ 22.12.0.
  - **Only a lone `--no-*` defaults to `true`.** Defining both forms sets no implicit default, which makes "prompt when the flag is absent" easy.
  - Commander 14 receives security fixes until May 2027.
- 15.1.0: `storeOptionsAsProperties()` and `combineFlagAndOptionalValue()` are deprecated.
- 13.0.0: excess arguments are an error by default (allow with `.allowExcessArguments()`). Multi-character short flags such as `-ws` throw.

**Compatibility considerations:** engines `>=22.12.0`, the CLI's highest runtime requirement. For typed `opts()`, use `@commander-js/extra-typings@15.1.0` (peer `commander ~15.1.0`; checked with `npm view` only).

**Verification status:** Negatable options are docs-confirmed. Everything else is installed-verified (measured). Breaking changes are from changelog.

### execa

- **Library name:** `execa`
- **Context7 library ID:** `/sindresorhus/execa/v10.0.1`, version-pinned but older (no 10.2.1 docs)
- **Selected version:** 10.2.1 (CLI dependency) · **Documentation version:** v10.0.1 (`docs/api.md`, `docs/errors.md`, `docs/windows.md`, `docs/shell.md`) · **Research date:** 2026-11-24
- **Query topic:** Array-argument execution, `cwd`, `stdio: 'inherit'`, `reject: false`, `exitCode`, Windows `.cmd` handling
- **Official documentation URL:** https://github.com/sindresorhus/execa/blob/main/docs/api.md

**Confirmed configuration**

```ts
const r = await execa("npm", ["install"], { cwd: projectDir, stdio: "inherit", reject: false })
if (r.failed) console.error(r.shortMessage, r.exitCode) // no shell; r is an ExecaError on failure
```

- **Failure handling:** with `reject: false`, a failure _returns_ an `ExecaError`; with the default `reject`, a non-zero exit throws it. A missing command gives `exitCode: undefined` and `code: 'ENOENT'`, so decide success with `failed`, not `exitCode !== 0`.
- With `stdio: 'inherit'`, `result.stdout` is `undefined`. `stdout: ['pipe', 'inherit']` prints and captures at once (README, not measured).
- **Windows:** `.cmd` files are found through PATHEXT without `shell: true`. v10 uses `which-command` instead of `cross-spawn`, and rejects arguments that contain CR/LF.

**Deprecated APIs / breaking changes**

- 10.0.0: requires Node 22. The subprocess is a plain Promise, with `.on()` and `.send()` on `subprocess.nodeChildProcess`. `execaCommand()` was removed (use the template syntax or `parseCommandString()`), and `stdio: [..., 'ipc']` became `ipc: true`.
- 10.1.0: `extendEnv: false` without `env` no longer inherits `process.env`, and Windows `.cmd`/`.bat` escaping changed.
- 10.2.0: exceeding `maxBuffer` kills the subprocess.

**Compatibility considerations:** engines `>=22`, ESM only.

**Verification status:** docs-confirmed and installed-verified (measured). Breaking changes are from changelog (GitHub releases).

### Node.js fs/promises

- **Library name:** Node.js `node:fs/promises`
- **Context7 library ID:** `/nodejs/node/v26.0.0`, version-pinned
- **Selected version:** runtime API, no package version; the CLI targets `>=22.12.0` · **Documentation version:** v26.0.0 (`doc/api/fs.md`), with version history from `raw.githubusercontent.com/nodejs/node/v26.0.0/doc/api/fs.md` · **Research date:** 2026-11-24
- **Query topic:** `fsPromises.cp` options, `mkdtemp`, `mkdtempDisposable`
- **Official documentation URL:** https://nodejs.org/api/fs.html

**Confirmed configuration**

```ts
const tmp = await realpath(await mkdtemp(join(tmpdir(), "cpx-")))
await cp(templateDir, targetDir, {
  recursive: true,
  force: false,
  errorOnExist: true, // existing → ERR_FS_CP_EEXIST
  filter: (src) => !src.includes(`${sep}node_modules`),
})
```

- `cp` defaults: `recursive: false`, `force: true`, `errorOnExist: false`, `verbatimSymlinks: false`.
- On macOS, `tmpdir()` is a symlink path, so normalize with `realpath` before comparing paths.
- `filter` is also called for the root `src`; returning `false` there copies nothing.
- **Relative symlinks become absolute links into the source** unless `verbatimSymlinks: true`. A scaffolder could end up with links into the npx cache, so reject symlinks (`lstat().isSymbolicLink()`) or set `verbatimSymlinks: true`.
- `force: false` without `errorOnExist` silently skips existing files.

**Deprecated APIs / breaking changes:** None recorded. `cp` was added in v16.7.0 and became stable in v22.3.0.

**Compatibility considerations:** `mkdtempDisposable` needs v24.4.0, which is above the CLI floor of 22.12, so it is not recommended.

**Verification status:** Option semantics are docs-confirmed. Behavior is installed-verified on Node 24.14; Node 26 was not run.

### tsdown

- **Library name:** `tsdown`
- **Context7 library ID:** `/rolldown/tsdown/v0.23.0`, version-pinned but older (0.23.7 not listed)
- **Selected version:** 0.23.7 (CLI devDependency; the build log showed rolldown 1.3.3) · **Documentation version:** v0.23.0 (`skills/tsdown/references/*`, `docs/options/dependencies.md`, `docs/guide/faq.md`) · **Research date:** 2026-11-24
- **Query topic:** Node CLI configuration, `platform`, shebang, external dependencies, config file format
- **Official documentation URL:** https://tsdown.dev

**Confirmed configuration**

```ts
// tsdown.config.ts (platform and format are also the defaults)
export default defineConfig({ entry: ["src/cli.ts"], platform: "node", format: "esm" })
```

- **Shebang:** keep `#!/usr/bin/env node` as the first line of the entry source. tsdown keeps it and runs `chmod 0o755` on the output.
- **Target and output:** `target` is read from `engines.node` (log: `target: node22.12.0`). Output uses `.mjs` even with `"type": "module"`.
- **`bin` is not written for you.** Point it at the emitted `.mjs` yourself. Automatic `exports.bin` needs `exports` enabled, and it is off by default.
- **Dependencies:** `dependencies` and `peerDependencies` stay external. devDependencies and phantom dependencies are bundled when imported. Override with `deps.neverBundle`, `deps.alwaysBundle` or `deps.onlyBundle`.
- `dts` is auto-detected; use `dts: false` for a CLI.

**Deprecated APIs / breaking changes**

- 0.23.0: dropped Node 25. Removed the tsup options (`bundle:false` → `unbundle:true`, `outExtension` → `outExtensions`, `publicDir` → `copy`). Renamed `skipNodeModulesBundle` → `deps.neverBundle: true` and `dts.oxc`/`dts.tsgo` → `dts.generator`.
- 0.22.0: dropped Node < 22.18 and the bundled `unrun` loader.
- 0.21.0: `external` → `deps.neverBundle` and `noExternal` → `deps.alwaysBundle`; the old names warn.

**Compatibility considerations:** Build-time only. Contributors need Node `^22.18.0 || ^24.11.0 || >=26.0.0`. A shebang injected through `banner` was not verified.

**Verification status:** The config pattern and `deps` defaults are docs-confirmed. Shebang, chmod, extension and `bin` behavior are installed-verified (test build and source). Breaking changes are from changelog.

### zod

- **Library name:** `zod`
- **Context7 library ID:** `/colinhacks/zod/v4.6.7`, pinned to the exact version and queried during CLI research. The later app-library query failed because the quota was exceeded.
- **Selected version:** 4.6.7 (CLI and generated projects) · **Documentation version:** v4.6.7 (`api.mdx`, `error-formatting.mdx`, `json-schema.mdx`) · **Research date:** 2026-11-24
- **Query topic:** `z.strictObject`, `z.enum`, `.default`, `safeParse`, error formatting, refine/superRefine, `z.toJSONSchema`
- **Official documentation URL:** https://zod.dev

**Confirmed configuration**

```ts
import { z } from "zod" // the root export is the v4 classic API
const Config = z.strictObject({ name: z.string().min(1), install: z.boolean().default(true) })
const r = Config.safeParse(input)
if (!r.success) console.error(z.prettifyError(r.error))
```

- `z.object()` **silently strips** unknown keys, so use `z.strictObject` to reject them.
- `superRefine` still runs after continuable issues, but not after non-continuable type issues. Use `when` to control the timing, or `abort: true` to stop at once.
- **`z.toJSONSchema`:** it drops refinements instead of throwing, and targets draft-2020-12 by default. The default `io: 'output'` lists `.default()` fields as `required`, so use `io: 'input'` for user-written config files.

**Deprecated APIs / breaking changes**

- `ZodError#format()` and `#flatten()` → `z.treeifyError`, `z.flattenError`, `z.prettifyError`.
- `z.nativeEnum()` → `z.enum()`; `.passthrough()` → `z.looseObject()`; `.merge()` → `A.extend(B.shape)`; `z.string().email()` → `z.email()`.
- `.strict()` and `.superRefine()` are **not** deprecated in 4.6.7.

**Compatibility considerations:** No `engines` field. zod 4 implements Standard Schema, so TanStack Router `validateSearch` accepts it directly, and `@hookform/resolvers` peers `zod ^3.25.0 || ^4.0.0`.

**Verification status:** docs-confirmed and installed-verified (measured). Deprecation tags are installed-verified (`v4/classic/*.d.ts`).

---

## App libraries

### axios

- **Library name:** `axios`
- **Context7 library ID:** `/axios/axios/v1.13.2`, version-pinned but older (no 1.21.x pin)
- **Selected version:** 1.21.1 · **Documentation version:** v1.13.2, plus the installed `CHANGELOG.md` (1.16.0–1.21.0) and GitHub releases v1.20.0–v1.21.1 · **Research date:** 2026-11-24
- **Query topic:** `axios.create`, timeout, interceptors, AbortController `signal`, `isAxiosError`, response generics
- **Official documentation URL:** https://axios-http.com/docs/intro

**Confirmed configuration**

```ts
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "/api", timeout: 10_000 })
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})
```

- Pass React Query's `signal` with `api.get<T>(url, { signal })`.
- To handle errors, check `axios.isCancel(error)` first, then narrow with `axios.isAxiosError<Body>(error)`. `isAxiosError` also works as a named export.
- Type `VITE_API_URL` by augmenting `ImportMetaEnv` in `src/vite-env.d.ts`.

**Deprecated APIs / breaking changes**

- 1.21.0: header defaults accept only plain objects, null-prototype maps and `AxiosHeaders`. Plain-object `headers` are unaffected.
- 1.21.1: `follow-redirects ^1.16.2` fixes CVE-2026-116689 (Node HTTP adapter only).
- 1.20.0: `PayloadTooLarge` and `UnprocessableEntity` became deprecated aliases. Navigation-cancelled XHR requests now reject with `ECONNABORTED`.

**Compatibility considerations:** The package is `"type": "module"` and ships `index.d.ts` and `index.d.cts`. The 1.19.0 params generics did not affect `get<T>`/`post<T>`.

**Verification status:** docs-confirmed (v1.13.2 pin), from changelog (1.16–1.21.1), and installed-verified (tsc only, on tsc 7.0.2, no runtime).

### React Hook Form and @hookform/resolvers

- **Library name:** `react-hook-form`, `@hookform/resolvers` (with `zod`)
- **Context7 library ID:** RHF `/react-hook-form/react-hook-form/v7.90.0` (pinned but older) and `/react-hook-form/documentation` (not pinned); resolvers `/react-hook-form/resolvers/v7.0.2` (pinned but older); zod not queried, quota exceeded.
- **Selected version:** react-hook-form 7.92.0, @hookform/resolvers 7.0.8, zod 4.6.7 · **Documentation version:** RHF v7.90.0 and documentation master; resolvers v7.0.2; GitHub releases v6.0.0–v7.0.8 · **Research date:** 2026-11-24
- **Query topic:** zod v4 resolver import path, `useForm` generics, `setError` and `root.*`, accessible errors, resolvers v6→v7
- **Official documentation URL:** https://react-hook-form.com , https://github.com/react-hook-form/resolvers , https://zod.dev

**Confirmed configuration**

```tsx
import { zodResolver } from "@hookform/resolvers/zod" // import from 'zod', not 'zod/v4'
const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", email: "", newsletter: false },
})
```

- **Generics:** omit them so they are inferred, or give all three. A single generic with a `.default()` schema is a type error (README; reproduced).
- **Server errors:** use `setError('email', { type: 'server', message }, { shouldFocus: true })` for a field. Use `setError('root.server', ...)` for an error that belongs to no field; it does not persist to the next submit.
- Avoid the field names `root`, `type`, `ref`, `types`, `message` and `form`.
- **Accessibility:** set `aria-invalid` and point `aria-describedby` at the error's `id`, and render the error in a `<p role="alert">`. This matches the RHF docs.
- **Numeric inputs:** `z.coerce.number()` turns an empty input into 0. Instead, use `setValueAs: (v) => (v === '' ? undefined : Number(v))` with `z.number().optional()`.

**Deprecated APIs / breaking changes**

- Resolvers v6.0.0 (2026-10-19): the effect-ts resolver requires `effect@^4`.
- Resolvers v7.0.0 (2026-10-31): the typebox resolver requires `typebox ^1.0.0`.
- Resolvers v7.0.7: selects the Zod 4 overload for generic Zod 4 schemas.
- **zod usage is unchanged from resolvers v5.** In zod itself, `z.string().email()` is deprecated in favor of `z.email()`.

**Compatibility considerations:** Resolvers peer `zod ^3.25.0 || ^4.0.0` and `react-hook-form ^7.55.0`. `standardSchemaResolver` is an alternative, but the template does not need it.

**Verification status:** RHF and resolvers are docs-confirmed, from changelog and installed-verified (tsc only, on tsc 7.0.2, no runtime). The zod API was checked with `.d.ts` and tsc only.

### React Router

- **Library name:** `react-router`
- **Context7 library ID:** `/remix-run/react-router`, not pinned, because the listing stopped at 7.9.4. The secondary `/websites/reactrouter` returned only v7-era future-flag docs.
- **Selected version:** 8.5.2 (new major) · **Documentation version:** main branch (v8 CHANGELOG, `docs/upgrading/v7.md`) plus the installed package's `CHANGELOG.md`, `docs/` and `.d.ts` · **Research date:** 2026-11-24
- **Query topic:** v7→v8 breaking changes, minimum versions, data mode, nested routes, `ErrorBoundary`, `lazy`, catch-all
- **Official documentation URL:** https://reactrouter.com , upgrade guide https://reactrouter.com/upgrading/v7

**Confirmed configuration**

```tsx
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: "users", lazy: { Component: async () => (await import("./users")).UsersPage } },
      { path: "*", Component: NotFound },
    ],
  },
])
```

- **`RouterProvider` import:** import it from `react-router/dom`, as the bundled v8 docs recommend; that version wires `flushSync`. Everything else comes from `react-router`.
- A Data-mode `ErrorBoundary` takes no props. Read the error with `useRouteError()` and narrow it with `isRouteErrorResponse`.
- `Component`/`element` and `ErrorBoundary`/`errorElement` are mutually exclusive pairs. `lazy` can be a function or an object. The `users` route was split into its own chunk.

**Deprecated APIs / breaking changes**

- **The `react-router-dom` package is gone** (npm latest is 7.18.6). Do not add it.
- ESM only. All `future.v8_*` flags became default behavior.
- Removed: the `data` field of `meta`/`useMatches()` (use `loaderData`) and `RouteObject.hasErrorBoundary`.
- 8.5.0 deprecated `viewTransition`, `useViewTransitionState` and `NavLink`'s `isTransitioning`. Use React 19.3 `<ViewTransition>` instead.

**Compatibility considerations:** engines `node >=22.22.0`, the strictest of the app libraries. Peers `react >=19.2.7` and `react-dom >=19.2.7`.

**Verification status:** docs-confirmed, from changelog, and installed-verified (tsc + build on tsc 7.0.2, no runtime).

### TanStack Query

- **Library name:** `@tanstack/react-query`, `@tanstack/react-query-devtools`
- **Context7 library ID:** `/tanstack/query`, not pinned (the newest pin, v5.90.3, is older)
- **Selected version:** 5.108.4 (both) · **Documentation version:** main branch (source `query-core/src/*.ts` and docs) · **Research date:** 2026-11-24
- **Query topic:** Important defaults, `defaultOptions`, devtools in production, `queryOptions`, mutations with `invalidateQueries`
- **Official documentation URL:** https://tanstack.com/query/latest/docs/framework/react/overview

**Confirmed configuration**

```tsx
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})
const usersQueryOptions = () => queryOptions({ queryKey: ["users", "list"], queryFn: ({ signal }) => getUsers(signal) })
```

- **Defaults** (from source): query `retry` is 3 on the client and mutation `retry` is 0. `staleTime` is 0, `gcTime` is 5 minutes, and `refetchOnWindowFocus` is true.
- Returning `invalidateQueries(...)` from `onSuccess` keeps `isPending` true until it settles.
- **Devtools are removed from production builds automatically.** The default export is `() => null` unless `process.env.NODE_ENV` is `development`; Vite `--mode development` alone does not change this. A static import left 0 devtools strings in the build. Mixing static and `lazy()` imports triggers Rolldown `INEFFECTIVE_DYNAMIC_IMPORT`, so use the static import only.

**Deprecated APIs / breaking changes:** None recorded for 5.108.x.

**Compatibility considerations:** With TanStack Router, set `defaultPreloadStaleTime: 0` so that Query owns caching. A query key factory object (`userKeys`) is a community convention that the docs did not show (unconfirmed); reuse `queryOptions` instead.

**Verification status:** docs-confirmed (defaults from source) and installed-verified (tsc + build on tsc 7.0.2, no runtime). The key factory shape is unconfirmed.

### TanStack Router

- **Library name:** `@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/router-cli`
- **Context7 library ID:** `/tanstack/router`, not pinned (the newest pin, v1.139.3, is older)
- **Selected version:** `@tanstack/react-router` 1.170.46, `@tanstack/router-plugin` 1.169.0, `@tanstack/router-cli` 1.168.0 · **Documentation version:** main branch (`packages/*/skills/*/SKILL.md`, `docs/router/*`) · **Research date:** 2026-11-24
- **Query topic:** Vite plugin and order, `autoCodeSplitting`, root route, `validateSearch` with zod v4, `Register`, `tsr generate`, committing `routeTree.gen.ts`
- **Official documentation URL:** https://tanstack.com/router/latest/docs/framework/react/overview

**Confirmed configuration**

```ts
plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react()] // router plugin first
const search = z.object({ page: z.number().int().min(1).default(1).catch(1) }) // zod v4, no adapter
export const Route = createFileRoute("/users")({ validateSearch: search, component: UsersPage })
```

- **Plugin order:** the docs warn that putting the router plugin after `react()` makes generation and code splitting fail silently. This was not reproduced.
- In 1.170.x, the `error` prop of `errorComponent` is `unknown`; narrow it with `instanceof Error`. Register the router type through `interface Register { router: typeof router }`.
- **Route tree and `tsc -b`:**
  - Without `routeTree.gen.ts`, tsc fails in every route file. `tsr generate` and the Vite plugin produced byte-identical files.
  - Put non-default settings in `tsr.config.json`, because the CLI cannot see the inline options in `vite.config.ts`.
  - Add `.tanstack/tmp` to `.gitignore`. Commit `routeTree.gen.ts` (FAQ), or run `"typecheck": "tsr generate && tsc -b"`.

**Deprecated APIs / breaking changes:** `NotFoundRoute` is deprecated; use the root `notFoundComponent`. With zod v4, do not install `@tanstack/zod-adapter`; pass the schema directly and use `.catch()`.

**Compatibility considerations:** Plugin peers `vite >=6.0.0`. Plugin and CLI engines are `node ^20.19.0 || >=22.12.0`. On Node 24.14.0, `tsr` prints a `replaceRouteChunk` circular-dependency warning, but generation works.

**Verification status:** docs-confirmed and installed-verified (tsc + build on tsc 7.0.2, no runtime). The plugin-order failure is documented only.

### TanStack Table

- **Library name:** `@tanstack/react-table`
- **Context7 library ID:** `/tanstack/table/_tanstack_react-table_9.2.4`, version-pinned but older (no 9.3.1 pin)
- **Selected version:** 9.3.1 (new major) · **Documentation version:** @tanstack/react-table@9.2.4, plus the installed package's `skills/*/SKILL.md` (`library_version: '9.3.1'`) and `.d.ts` · **Research date:** 2026-11-24
- **Query topic:** v8→v9 migration, `useTable`, `tableFeatures`, row models, column helper, sorting, filtering, pagination, state subscription
- **Official documentation URL:** https://tanstack.com/table/latest

**Confirmed configuration**

```tsx
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { text: sortFn_text },
}) // module scope = stable reference
const helper = createColumnHelper<typeof features, Person>()
const table = useTable({
  features,
  columns,
  data,
  state: { globalFilter },
  onGlobalFilterChange: setGlobalFilter,
  globalFilterFn: "includesString",
})
```

- Render cells with `<table.FlexRender header={h} />` and `<table.FlexRender cell={c} />`.
- **Feature setup:** `globalFilteringFeature` needs `columnFilteringFeature` first. APIs of unregistered features **disappear from the types** (TS2339, reproduced).
- **Stable references:** keep `features`, `columns` and fallback data stable. An inline `data ?? []` invalidates the row models on every render.
- **State:** the default subscribes to the whole state. For large tables, narrow it with `useTable(opts, () => null)` plus `table.Subscribe`.

**Deprecated APIs / breaking changes**

- `useReactTable` → `useTable`, and `features` became a required option.
- `getCoreRowModel` was removed; the other row models moved into `tableFeatures` slots. `sortingFn` → `sortFn`.
- `createColumnHelper` takes `TFeatures` as its first generic.
- `table.getState()` → `table.state`, and the global `onStateChange` was removed.
- Column pinning `left`/`right` → `start`/`end`.
- `useLegacyTable` and `table.store.state` are deprecated.

**Compatibility considerations:** peer `react >=18`, engines `node >=20`. `row.getVisibleCells()` needs `columnVisibilityFeature`; without it, use `row.getAllCells()`.

**Verification status:** docs-confirmed (9.2.4 pin), the bundled 9.3.1 SKILL docs, and installed-verified (tsc only, on tsc 7.0.2, no runtime).

### zustand

- **Library name:** `zustand`
- **Context7 library ID:** `/pmndrs/zustand/v5.0.14`, version-pinned but older (no 5.1.0 pin). The migration docs came from `/pmndrs/zustand` (main).
- **Selected version:** 5.1.0 · **Documentation version:** v5.0.14 and main, plus GitHub release v5.1.0 · **Research date:** 2026-11-24
- **Query topic:** Curried `create<T>()(...)`, `useShallow`, `persist` with `createJSONStorage`, `partialize`, v5 migration
- **Official documentation URL:** https://zustand.docs.pmnd.rs/

**Confirmed configuration**

```ts
// create<UiState>()(...): the curried form is required in TS
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: "ui", storage: createJSONStorage(() => localStorage), partialize: (s) => ({ theme: s.theme }), version: 1 }
  )
)
const useSidebar = () => useUiStore(useShallow((s) => ({ open: s.sidebarOpen, toggle: s.toggleSidebar })))
```

- Import `useShallow` from `zustand/react/shallow`. `name` is the storage key and must be unique.

**Deprecated APIs / breaking changes**

- 5.1.0 has no breaking changes. `persist.rehydrate()` returns a native `Promise<void>`, and `devtools` gains `actionCreators`.
- v5 compared with v4: the default export is gone, React 18+ and TS 4.5+ are required, and `create(selector, equalityFn)` was removed (use `createWithEqualityFn` from `zustand/traditional`). **A selector that returns a new reference on every call loops forever;** use `useShallow`.
- The "Persist middleware behavioral change" item in the migration docs was not read (unconfirmed).

**Compatibility considerations:** The installed package is `type: commonjs`. Its peers `react >=18`, `immer >=9.0.6` and `use-sync-external-store >=1.2.0` are all optional.

**Verification status:** docs-confirmed (v5.0.14 pin), from changelog (5.1.0 release note), and installed-verified (tsc only, on tsc 7.0.2, no runtime).

---

## Quality and testing

### ESLint and plugins

- **Library name:** `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@tanstack/eslint-plugin-query`, `globals`
- **Context7 library ID:** `/eslint/eslint/v10.5.0` and `/typescript-eslint/typescript-eslint/v8.72.1` (pinned but older); `/arnaudbarre/eslint-plugin-react-refresh` and `/tanstack/query` (not pinned). For react-hooks and globals, Context7 was deliberately not used (tarball README and runtime exports instead).
- **Selected version:** `eslint` 10.15.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.74.0, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-react-refresh` 0.5.8, `@tanstack/eslint-plugin-query` 5.108.4, `globals` 17.14.0 · **Documentation version:** ESLint v10.5.0 plus the `v10.15.0` tag's `docs/src/use/migrate-to-10.0.0.md`; typescript-eslint v8.72.1; react-refresh CHANGELOG · **Research date:** 2026-11-24
- **Query topic:** Flat config composition, preset export names, ESLint 10 migration, need for eslint-config-prettier
- **Official documentation URL:** https://eslint.org/docs/latest/use/migrate-to-10.0.0 , https://typescript-eslint.io/packages/typescript-eslint/

**Confirmed configuration**

```js
export default defineConfig([
  globalIgnores(["dist", "coverage", ".vitest"]),
  {
    // both from 'eslint/config'
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
      pluginQuery.configs["flat/recommended"],
    ],
    languageOptions: { globals: globals.browser },
  },
])
```

- Measured on ESLint 10.15.0 with TS 6.0.3: no TypeScript version warning, and every plugin's rules applied.
- **react-hooks:**
  - Use `configs.flat.recommended`. The legacy `configs.recommended` aborts ESLint 10 with `A config object has a "plugins" key defined as an array of strings`; the query plugin's legacy config does the same.
  - React Compiler rules are on, so `setState` in an effect is reported as an error. Template example code must pass them.
- **react-refresh:** use the named export `{ reactRefresh }`, whose `configs.vite()` is a function. The default export is a pre-called back-compat object.
- **eslint-config-prettier is effectively unnecessary** (judgment). ESLint 10.15.0 still ships deprecated formatting rules such as `indent` and `semi`. But of the 93 rules active above, only `no-unexpected-multiline` overlaps the rules that eslint-config-prettier turns off.

**Deprecated APIs / breaking changes**

- `tseslint.config(...)` is deprecated; use `defineConfig`. react-refresh renamed `customHOCs` to `extraHOCs`.
- ESLint 10: eslintrc was removed. Config lookup starts from each linted file's directory, so per-package configs apply in monorepos.
- ESLint 10 also adds `no-unassigned-vars`, `no-useless-assignment` and `preserve-caught-error` to `eslint:recommended`, reports `/* eslint-env */` comments as errors, and needs jiti `>=2.2.0` for an `eslint.config.ts`.

**Compatibility considerations:** typescript-eslint 8.74.0 peers **`typescript >=4.8.4 <6.1.0`**, which blocks TS 7. eslint-plugin-query accepts `typescript ^5.6 || ^6 || ^7`. ESLint engines are `^20.19.0 || ^22.13.0 || >=24`.

**Verification status:** Config and exports are installed-verified (measured). ESLint 10 changes are docs-confirmed (v10.15.0 tag). The eslint-config-prettier conclusion is an assumption.

### husky and lint-staged

- **Library name:** `husky`, `lint-staged`
- **Context7 library ID:** husky: `/typicode/husky/v9.1.7`, pinned to the selected version and queried. lint-staged: not queried, quota exceeded (the 17.6.2 README and GitHub CHANGELOG were used instead).
- **Selected version:** husky 9.1.7, lint-staged 17.6.2 · **Documentation version:** husky v9.1.7; lint-staged 17.6.2 README and CHANGELOG · **Research date:** 2026-11-24
- **Query topic:** `husky init` behavior, hook format, CI skip, lint-staged config formats and v16–v17 changes
- **Official documentation URL:** https://typicode.github.io/husky/ , https://github.com/lint-staged/lint-staged

**Confirmed configuration**

```json
{
  "scripts": { "prepare": "husky" },
  "lint-staged": { "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"], "*.{json,css,md}": "prettier --write" }
}
```

- `.husky/pre-commit` contains only `npx lint-staged`. The hook runner puts `node_modules/.bin` on PATH.
- **Scaffolder rules:** write the hook files directly, because `husky init` writes `npm test` into the hook. **Without `.git`, `prepare` exits 0 and installs no hooks,** so run `git init` before install, or run `npx husky` again afterwards.
- `HUSKY=0` skips hooks in CI. For a project that is not at the git root, use `"prepare": "cd .. && husky frontend/.husky"`.
- From lint-staged, run Vitest as `vitest related --run`.

**Deprecated APIs / breaking changes**

- husky: the v8 header (`. "$(dirname -- "$0")/_/husky.sh"`) is deprecated and will fail in v10.
- lint-staged 17.0.0: requires Node 22.22.1+ and Git `>=2.32.0`. `yaml` became optional, so an extensionless `.lintstagedrc` needs it installed.
- lint-staged 16.0.0: `--shell` was removed. For a task without file arguments, use the function form `'*.ts': () => 'tsc --noEmit'`.
- lint-staged 17.6.0: stages every tracked file a task modified. 17.6.2 limits this to the pathspec; use `--hide-unstaged` to avoid it.

**Compatibility considerations:** lint-staged engines `>=22.22.1` is part of the generated-project Node floor. In a monorepo, the nearest config applies to each staged file.

**Verification status:** husky is installed-verified (source) and docs-confirmed. lint-staged is from changelog. No hook was run on a real commit (unconfirmed).

### jest-dom

- **Library name:** `@testing-library/jest-dom`
- **Context7 library ID:** `/testing-library/jest-dom`, not pinned. The only pin is v6.9.1, which has no v8 information.
- **Selected version:** 8.0.0 · **Documentation version:** v6.9.1 in Context7, plus the npm 8.0.0 README, its `exports` field and the GitHub v7.0.0–v8.0.0 release notes · **Research date:** 2026-11-24
- **Query topic:** Vitest setup, TypeScript types, v7 and v8 changes
- **Official documentation URL:** https://github.com/testing-library/jest-dom#with-vitest

**Confirmed configuration**

```ts
// src/test/setup.ts (listed in test.setupFiles)
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
afterEach(() => {
  cleanup()
})
```

- Matcher types work when the setup file is inside the tsconfig `include` range. With `globals: false`, no `compilerOptions.types` entry is needed (TS 6.0.3, 0 errors).

**Deprecated APIs / breaking changes:** v7.0.0 made `@testing-library/dom` a required peer and raised the minimum Node to 22. v8.0.0 dropped Vitest below 5; use v7 with Vitest 4. v8 exists because Vitest 5 bundles its own `expect`.

**Compatibility considerations:** engines `>=22`. Peers: vitest `>=5 <6` (optional) and `@testing-library/dom >=10 <11` (required).

**Verification status:** installed-verified (measured) and from changelog.

### Prettier and prettier-plugin-tailwindcss

- **Library name:** `prettier`, `prettier-plugin-tailwindcss`
- **Context7 library ID:** `/prettier/prettier/3.9.10` (pinned but older) and `/prettier/eslint-config-prettier/v10.1.8` (pinned). The plugin was not queried; quota exceeded (the 0.8.1 README and CHANGELOG were used instead).
- **Selected version:** prettier 3.10.1, prettier-plugin-tailwindcss 0.8.1 · **Documentation version:** Prettier 3.9.10; plugin 0.8.1 README · **Research date:** 2026-11-24
- **Query topic:** Config file, Tailwind class sorting, ignore files
- **Official documentation URL:** https://prettier.io/docs/configuration , https://github.com/tailwindlabs/prettier-plugin-tailwindcss

**Confirmed configuration**

```js
// prettier.config.js (package.json has "type": "module")
export default { plugins: ["prettier-plugin-tailwindcss"], tailwindStylesheet: "./src/index.css", tailwindFunctions: ["cn", "cva"] }
```

- `tailwindStylesheet` is required for Tailwind v4. Measured: classes sorted to `flex bg-red-500 p-4 text-white`, including the arguments of `cn(...)`.
- Load this plugin **last** among Prettier plugins. Prettier 3 already ignores `.gitignore` entries, so `.prettierignore` only needs extras such as `pnpm-lock.yaml`.

**Deprecated APIs / breaking changes:** The v3 option `tailwindConfig` is not used with v4. Plugin 0.8.0 needs Prettier `>=3.7`, although its peer says `^3.0`. The plugin has been ESM only since 0.5.

**Compatibility considerations:** Plugin engines `>=20.19`.

**Verification status:** installed-verified (measured) and from changelog. New options in Prettier 3.10.x were not researched (unconfirmed).

### React Testing Library and user-event

- **Library name:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`
- **Context7 library ID:** `/testing-library/testing-library-docs`, not pinned. RTL's own `/testing-library/react-testing-library` has a v16.3.3 pin but was deliberately not queried; the 16.3.3 source was read instead.
- **Selected version:** `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.13, `@testing-library/dom` 10.4.2 · **Documentation version:** testing-library-docs (unpinned) and the RTL 16.3.3 `dist/index.js` · **Research date:** 2026-11-24
- **Query topic:** Auto cleanup under Vitest, act environment, user-event setup
- **Official documentation URL:** https://testing-library.com/docs/react-testing-library/setup#auto-cleanup-in-vitest , https://testing-library.com/docs/user-event/intro

**Confirmed configuration**

```tsx
const user = userEvent.setup() // inside the test, before render; not in before/after hooks
render(<Counter />)
await user.click(screen.getByRole("button"))
```

- **Cleanup:** auto cleanup registers only when a global `afterEach` exists. With `globals: false`, call `afterEach(cleanup)` in the setup file. Without it, the second test found two buttons and failed.
- No act warnings appeared, because `render` and `act` set `IS_REACT_ACT_ENVIRONMENT` temporarily (source).

**Deprecated APIs / breaking changes:** None recorded.

**Compatibility considerations:** `@testing-library/dom` is a peer of both RTL and jest-dom, so list it in devDependencies. RTL peers `react ^18 || ^19`.

**Verification status:** installed-verified (measured and source) and docs-confirmed.

### Vitest and jsdom

- **Library name:** `vitest`, `jsdom`
- **Context7 library ID:** `/vitest-dev/vitest/v5.0.3`, version-pinned but older (no 5.1.1 pin). No Context7 ID is recorded for jsdom.
- **Selected version:** vitest 5.1.1, jsdom 31.0.1 · **Documentation version:** v5.0.3, plus the `v5.1.1` tag's `docs/guide/migration/index.md` and `docs/guide/cli.md` · **Research date:** 2026-11-24
- **Query topic:** v4→v5 migration, test config in `vite.config`, setupFiles, globals, projects inheritance, run versus watch
- **Official documentation URL:** https://vitest.dev/guide/migration , https://vitest.dev/config/

**Confirmed configuration**

```ts
/// <reference types="vitest/config" />
export default defineConfig({
  plugins: [react(), tailwindcss()], // defineConfig from 'vite'
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } }, // top level, not in test
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"] },
})
```

- `vitest` watches in development and runs once in CI or without a TTY. `vitest run` always runs once. `globals` defaults to `false`.
- **Vite 8:** `__dirname` in the config triggers a native-config-loader warning. Use `import.meta.dirname`, which needs `@types/node`.

**Deprecated APIs / breaking changes**

- **Requirements:** Vite `>=6.4.0` and Node `>=22.12.0`. `vite` became a required peer.
- **Behavior changes:** **`clearMocks` defaults to `true`** (measured), and **un-awaited `resolves`, `rejects` and `toMatchFileSnapshot` fail the test.**
- Inline `test.projects` inherit the root config, config files are not searched in parent directories, and reports go to `.vitest/` (add it to `.gitignore`).
- **Removed APIs:** `test.sequential` (use `{ concurrent: false }`), and entry points such as `vitest/coverage` and `vitest/reporters`.
- `expect.extend` must use the `expect` from `vitest`.

**Compatibility considerations:** jsdom 31.0.1 engines **`^22.22.2 || ^24.15.0 || >=26.0.0`** set the generated-project Node floor. These measurements ran on Node 24.14.0: npm only warned `EBADENGINE`, but `engine-strict` would fail. Node 24.15+ was not run.

**Verification status:** Config and behavior are installed-verified, on Node 24.14.0, outside jsdom's engines range. Breaking changes are docs-confirmed (v5.1.1 source).

---

## UI

### shadcn CLI

- **Library name:** `shadcn` CLI and the dependencies its registry adds
- **Context7 library ID:** `/shadcn-ui/ui`. The ID was identified (pins up to `shadcn_4.21.0`), but the query was not possible because the quota was exceeded.
- **Selected version:** shadcn 4.23.0; registry dependencies class-variance-authority 0.7.1, cn 0.5.2, tw-animate-css 1.4.0, lucide-react 1.79.0, @fontsource-variable/geist 5.3.0, @base-ui/react 1.9.0, radix-ui 1.8.1 · **Documentation version:** tag `shadcn@4.23.0` docs (`apps/v4/content/docs/(root)/{cli,components-json,monorepo,theming}.mdx`, `installation/vite.mdx`), 4.23.0 `--help` output, and the npm tarballs `shadcn@4.23.0` and `@shadcn/registry@0.2.1` · **Research date:** 2026-11-24
- **Query topic:** `init`/`add` options, non-interactive conditions, presets and bases, `components.json`, preflight errors, monorepo, license
- **Official documentation URL:** https://ui.shadcn.com/docs/cli , https://ui.shadcn.com/docs/components-json , https://ui.shadcn.com/docs/monorepo , https://ui.shadcn.com/docs/installation/vite

**Confirmed configuration**

- **Command for an existing Vite project** (derived from source reading): `npx shadcn@4.23.0 init --preset nova --base radix --no-monorepo --no-reinstall --cwd <dir>`. Use `--base base` for Base UI, and add `--force` when re-running.
- **Non-interactive conditions** (source reading):
  - **`--preset`, `--base` and `--defaults` decide whether prompts appear.** `--yes` already defaults to true and only skips the `components.json` confirmation.
  - `--defaults` without `-t` picks the `next` template, so do not use it for Vite. `-t <template>` adds `button` automatically. Init needs the network, because it turns the preset into a registry URL.
- **Preset and style values:**
  - Preset codes (for example `a2r6bw`) and URLs are accepted besides the eight names. `--preset=base-nova`, which the `--defaults` help shows, is not a valid name (`isPresetCode` returns false).
  - In `components.json`, `style` is `<base>-<style>`, such as `base-nova` or `radix-nova`.
  - Base colors: `neutral`, `stone`, `zinc`, `gray`, `mauve`, `olive`, `mist`, `taupe`.
- **Init registry response** (nova, vite, neutral):
  - Dependencies: `shadcn@latest` (unpinned), `class-variance-authority`, `cn`, `tw-animate-css` and `lucide-react`, plus `@base-ui/react` or `radix-ui`, and `font-geist`.
  - CSS imports: `tw-animate-css` and `shadcn/tailwind.css`.
- **`lib/utils.ts` is `export { cn } from "cn"`.** The MIT package `cn` replaces clsx and tailwind-merge, and components import it directly.
- **Preflight errors:**
  - Init exits 1 with `We could not detect a supported framework` unless a `vite.config.*` exists directly under cwd.
  - **"No Tailwind CSS configuration found"** means `tailwindcss` is missing from the dependencies, or no CSS file within depth 5 _literally_ contains `@import "tailwindcss"`. `@import url("tailwindcss");` is not detected, so create the CSS before init.
  - **"Could not find valid path aliases or package imports"** means there are no tsconfig `paths` and no `package.json#imports`.
- **`paths` must be in both tsconfigs** (measured). With a solution-style root tsconfig and `paths` only in `tsconfig.app.json`, `add button --dry-run` targeted the literal path `@/components/ui/button.tsx`. **Put `paths` in both the root `tsconfig.json` and `tsconfig.app.json`, without `baseUrl`.**
- **`add`:** `-y, --yes` defaults to **false**. For non-interactive use, run `add <c...> --yes --overwrite`.
- **Monorepo:** `init --monorepo -t vite` creates `apps/web` and `packages/ui`. Every workspace needs a `components.json` with the same `style`, `iconLibrary` and `baseColor`.
- **License:** MIT (`LICENSE.md` at the tag). That it covers registry code is an assumption. `cn` is also MIT.

**Deprecated APIs / breaking changes**

- The `diff` command became `add --diff`.
- The docs still show `"style": "new-york"`; follow the CLI's `<base>-<style>` values.
- The Vite docs' `"baseUrl": "."` fails on TS 6.0.3 with `error TS5101` (measured), so omit it.

**Compatibility considerations:** engines `>=20.18.1`. The init registry response lists `shadcn@latest` (whether init writes it as is remains open), while `dependency-versions.json` pins 4.23.0. The dark variant differs from the Tailwind docs; see Tailwind CSS.

**Verification status:**

- CLI options are installed-verified (`--help`).
- Non-interactive branches, error conditions and preset names are installed-verified through source reading, with direct function calls and `info`/`add --dry-run` runs on fixtures.
- The quality-tool research did not run `init`. The later scaffold runs are reflected only in Key decisions, so the init output items under "Unconfirmed and open items" remain open.

### Tailwind CSS

- **Library name:** `tailwindcss`, `@tailwindcss/vite`
- **Context7 library ID:** `/tailwindlabs/tailwindcss.com`. The ID was identified, but the query failed because the quota was exceeded.
- **Selected version:** 4.3.5 (both) · **Documentation version:** GitHub `tailwindlabs/tailwindcss.com`, `main` branch with no version tag (`using-vite/page.tsx`, `dark-mode.mdx`, `detecting-classes-in-source-files.mdx`, `theme.mdx`) · **Research date:** 2026-11-24
- **Query topic:** Vite installation, dark mode, source detection, theme tokens
- **Official documentation URL:** https://tailwindcss.com/docs/installation/using-vite

**Confirmed configuration**

```css
@import "tailwindcss";
@source "../../../packages/ui/src"; /* monorepo shared package; relative to this CSS file */
@custom-variant dark (&:where(.dark, .dark *));
@theme {
  --color-brand: oklch(0.6 0.2 250);
}
```

- Use the Vite plugin `tailwindcss()` from `@tailwindcss/vite`; no PostCSS config is needed. Measured: `vite build` on Vite 8.3.8 emitted all of the above.
- **Source detection:** automatic detection starts from cwd and skips `.gitignore` entries and `node_modules`, including linked workspace packages. Scan shared packages with `@source`; that they are skipped without it is documented only.
- **Two dark-variant forms are in use:**
  - Tailwind docs: `&:where(.dark, .dark *)`, which includes `.dark` itself and has zero specificity.
  - shadcn: `&:is(.dark *)`, which matches descendants only and adds specificity.
  - shadcn init probably writes its own form (assumption). A decision is needed.

**Deprecated APIs / breaking changes:** None recorded. The v3 `tailwind.config.*` does not apply: shadcn uses `tailwind.config: ""`, and Prettier uses `tailwindStylesheet`.

**Compatibility considerations:** `@tailwindcss/vite` peers vite `^5.2 || ^6 || ^7 || ^8`.

**Verification status:** installed-verified (build) and docs-confirmed from `main`. Whether `main` matches the 4.3.5 tag was not checked.

---

## Workspace and infrastructure

### Bun

- **Library name:** Bun (package manager and `bun create`)
- **Context7 library ID:** not queried, quota exceeded
- **Selected version:** not a selected dependency; researched 1.4.5 (2026-11-19) · **Documentation version:** GitHub `oven-sh/bun` `docs/` (`runtime/templating/create.mdx`, `pm/lifecycle.mdx`, `pm/workspaces.mdx`, `pm/bunx.mdx`) · **Research date:** 2026-11-24
- **Query topic:** `bun create`, dependency lifecycle scripts, workspaces, `bunx` argument passing
- **Official documentation URL:** https://bun.com/docs/runtime/templating/create , https://bun.com/docs/pm/lifecycle

**Confirmed configuration**

- `bun create <name>` runs `bunx create-<name>` when there is no local template. `react` and `next` are exceptions.
- **Lifecycle scripts:** dependency lifecycle scripts are off by default, and the default allowlist includes `esbuild` and `msw`. **`trustedDependencies` replaces that list instead of extending it,** so a generator that writes it must include esbuild.
- Workspaces support globs, negation and `workspace:*`. `bunx` forwards flags that come after the package name.

**Deprecated APIs / breaking changes:** None recorded.

**Compatibility considerations:** That `bun create produx-app my-app --flag` passes the flag through is inferred from two docs and was not run.

**Verification status:** docs-confirmed from the GitHub docs only; nothing was executed.

### Docker images

- **Library name:** Docker base images `node`, `nginx`, `nginxinc/nginx-unprivileged`
- **Context7 library ID:** not applicable (Docker Hub API and image inspection)
- **Selected version:** not in `dependency-versions.json`; researched `node:26.13.1-alpine3.24` and `nginxinc/nginx-unprivileged:1.30.6-alpine` · **Documentation version:** Docker Hub API (`https://hub.docker.com/v2/repositories/<repo>/tags/<tag>`) and `docker buildx imagetools inspect` · **Research date:** 2026-11-24
- **Query topic:** Current tags and digests, ports, users, HEALTHCHECK tools, SPA nginx config, pnpm build stage
- **Official documentation URL:** https://hub.docker.com/_/node , https://hub.docker.com/_/nginx , https://hub.docker.com/r/nginxinc/nginx-unprivileged , https://nodejs.org/dist/index.json

**Confirmed configuration**

- `node:26.13.1-alpine3.24` is the same image as `26-alpine` and `lts-alpine`: digest `sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`.
- `nginxinc/nginx-unprivileged:1.30.6-alpine` listens on 8080 and runs as `User=101`: digest `sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03`.

```nginx
location /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable" always; }
location = /index.html { add_header Cache-Control "no-cache" always; }
location / { try_files $uri $uri/ /index.html; }
```

- **nginx behavior** (measured): deep links fall back to `index.html` with `no-cache`, hashed assets get `immutable`, and missing assets return 404. `HEALTHCHECK ... CMD wget -q --spider http://127.0.0.1:8080/ || exit 1` reported `healthy`.
- **Build stage:** `npm install -g pnpm@12.23.0`, then `pnpm install --frozen-lockfile`. This succeeded with `allowBuilds: { esbuild: false }`.

**Deprecated APIs / breaking changes:** **`node:26-alpine` has no `corepack`,** so `corepack enable` fails; the bundled npm is 11.20.0. Combining `expires 1y;` with `add_header Cache-Control` sends two `Cache-Control` headers, so drop `expires`.

**Compatibility considerations**

- The unprivileged image lags the official one: official stable is 1.30.8 (2026-11-23), unprivileged stable is 1.30.6.
- The official `stable-alpine` and `1.30.8-alpine` digests differed at query time, so re-query digests before pinning.
- The researched build stage uses pnpm 12.23.0, while the JSON pins 11.13.0. The full multi-stage build was not run end to end.

**Verification status:** from changelog (Docker Hub API) and installed-verified (image runs, nginx behavior, build stage).

### GitHub Actions

- **Library name:** `actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `github/codeql-action`, `actions/upload-artifact`
- **Context7 library ID:** `/pnpm/action-setup/v6.1.1` exists but was not queried because the quota was exceeded. The other actions were not queried either (quota exceeded).
- **Selected version:** not in `dependency-versions.json`; see the SHA table · **Documentation version:** READMEs, `action.yml` and `src/install-pnpm/run.ts` at the listed releases, plus `actions/starter-workflows` `code-scanning/codeql.yml` · **Research date:** 2026-11-24
- **Query topic:** Latest releases and commit SHAs, caching, pnpm version resolution, CodeQL permissions
- **Official documentation URL:** https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning

**Confirmed configuration**

| Action                    | Release              | Commit SHA                                 |
| ------------------------- | -------------------- | ------------------------------------------ |
| `actions/checkout`        | v7.0.1 (2026-07-20)  | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node`      | v7.1.0 (2026-10-08)  | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `pnpm/action-setup`       | v6.1.1 (2026-11-03)  | `73e46992e05b19abd31f2f3c20e0e7370d762115` |
| `github/codeql-action`    | v4.39.4 (2026-11-20) | `1bd86f2fdb4b86187fa4059f16f31a3202acc9ea` |
| `actions/upload-artifact` | v7.0.2 (2026-10-07)  | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

- **pnpm setup:** `pnpm/action-setup` reads `packageManager`. Do not also set `version`, or a mismatch fails with `Multiple versions of pnpm specified`. setup-node caches automatically only for npm, so pnpm needs `cache: pnpm`.
- **CodeQL:** use `languages: javascript-typescript` with `build-mode: none`. The minimum permissions are `security-events: write` plus `contents: read`.

**Deprecated APIs / breaking changes:** checkout v7 blocks fork-PR checkout in `pull_request_target`/`workflow_run`. setup-node v7 removed the dummy `NODE_AUTH_TOKEN`. checkout, setup-node and upload-artifact v7 moved to ESM.

**Compatibility considerations:** codeql-action `releases/latest` returns `codeql-bundle-v2.27.5`, so read action versions from the `v4.x` tags. The CodeQL README prefers `@v4` over SHA pins; if you pin SHAs, update them with Renovate or Dependabot. `pnpm/action-setup` supports pnpm v12 and earlier.

**Verification status:** from changelog (release notes and API). The SHAs were dereferenced from tags with `gh api`. No workflow was executed.

### MSW

- **Library name:** `msw`
- **Context7 library ID:** `/mswjs/msw/v3.0.7`, pinned to the selected version. A v2→v3 migration query returned nothing, so the release notes and `npm pack` contents were used.
- **Selected version:** 3.0.7 (v3.0.0 released 2026-09-28) · **Documentation version:** v3.0.7 · **Research date:** 2026-11-24
- **Query topic:** v2→v3 migration, `setupWorker`, `msw init --save`, package exports and scripts, Vite plugin, `onUnhandledFrame`
- **Official documentation URL:** https://mswjs.io/docs , https://github.com/mswjs/msw/releases/tag/v3.0.0

**Confirmed configuration**

```ts
export const handlers = [http.get("/api/pets", () => HttpResponse.json([{ id: 1, name: "a" }]))] // from 'msw'
const server = setupServer(...handlers) // 'msw/node'
beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- In the browser, call `setupWorker(...handlers)` from `msw/browser`, then `worker.start({ onUnhandledFrame: 'bypass' })` in DEV.
- Measured with a Node script: unmatched requests print `[MSW] Error: intercepted a request without a matching request handler`.
- `msw init public --save` writes `public/mockServiceWorker.js` and `msw.workerDirectory`. Without `--save` or `--no-save`, it prompts.
- The new `msw/vite` plugin serves the worker in dev. It was read from the `.d.ts` JSDoc only and not run (unconfirmed).

**Deprecated APIs / breaking changes**

- ESM only; requires Node 22+ and TypeScript 5.9+.
- **`onUnhandledRequest` → `onUnhandledFrame`.**
- Moved APIs: `msw/native` → `@msw/react-native`, `graphql` → `msw/graphql`, `handleRequest()` → `defineNetwork()`.
- `worker.stop()` returns a Promise. Node no longer manages cookies (use the `cookies` argument), and the fake-timer `setTimeout` patch was removed.
- **`postinstall` was removed.** That `workerDirectory` is therefore no longer refreshed on install is an inference.

**Compatibility considerations:** engines `node >=22.12.0`. With no install script, MSW needs no pnpm `allowBuilds` entry. Orval-generated handlers use the `msw` root exports and are compatible.

**Verification status:** from changelog (release notes) and installed-verified (types, `setupServer`, `msw init`). The Vite plugin is unconfirmed.

### npm

- **Library name:** npm CLI
- **Context7 library ID:** not queried, quota exceeded
- **Selected version:** not a selected dependency; researched the registry `latest`, 12.2.3 · **Documentation version:** `npm/cli` docs (`npm-init.md`, `npm-install-scripts.md`, `npm-approve-scripts.md`, `using-npm/workspaces.md`) · **Research date:** 2026-11-24
- **Query topic:** Lifecycle-script blocking, `allowScripts`, `npm create` arguments, workspaces
- **Official documentation URL:** https://docs.npmjs.com/cli/commands/npm-init , https://github.com/npm/cli/releases/tag/v12.0.0

**Confirmed configuration**

- Approve scripts with `{ "allowScripts": { "esbuild": true } }` in the root `package.json`. `npm install-scripts approve` pins versions by default (`{"esbuild@0.28.2": true}`).
- In `npm create x@latest my-app -- --flag`, only the arguments after `--` reach the create package.
- Workspaces: declare `"workspaces": ["apps/*", "packages/*"]`, then use `npm install <pkg> -w <ws>`.

**Deprecated APIs / breaking changes:** npm 12.0.0 (2026-07-08) supports Node `^22.22.2 || ^24.15.0 || >=26.0.0`. **It blocks dependency lifecycle scripts by default:** esbuild printed `npm warn install-scripts ... blocked` and exited **0**. Unlike pnpm, npm does not fail.

**Compatibility considerations:** Node 26.13.1 bundles npm 11.20.0, and Node 24.22.3 bundles npm 11.19.1. Whether npm 11 blocks scripts or only warns is unconfirmed. The docs show no `workspace:` protocol, so do not write `workspace:*` in npm mode (judgment based on missing docs).

**Verification status:** from changelog (release notes) and installed-verified (npm 12.2.3: `allowScripts`, warning then exit 0).

### Orval

- **Library name:** `orval`
- **Context7 library ID:** `/orval-labs/orval/v8.48.0`, version-pinned but older (no 8.49.0)
- **Selected version:** 8.49.0 (2026-11-22) · **Documentation version:** v8.48.0 · **Research date:** 2026-11-24
- **Query topic:** `defineConfig`, react-query with `httpClient`, mutator, v8 breaking changes, formatter, hooks
- **Official documentation URL:** https://orval.dev/docs/reference/configuration/output , https://orval.dev/docs/versions/v8

**Confirmed configuration**

```ts
export default defineConfig({
  api: {
    input: { target: "./openapi/openapi.yaml" },
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      mock: true,
      override: { mutator: { path: "./src/api/http.ts", name: "customFetch" } },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
})
```

- The fetch mutator must return `{ data, status, headers }` (measured).
- **Generated imports** (measured):
  - With `httpClient: 'fetch'`, the generated code has **no `axios` import**.
  - **`mock: true` imports `@faker-js/faker`,** which must be a devDependency (10.6.0 passed the type check).
  - Mocks are split into `<tag>.faker.ts` and `<tag>.msw.ts`.

**Deprecated APIs / breaking changes:** v8 is fully ESM and needs Node 22.18+. **The default `httpClient` changed from `axios` to `fetch`;** set `httpClient: 'axios'` to keep axios.

**Compatibility considerations:** engines `node >=22.18.0`. **Orval pulls in esbuild,** so pnpm 11+ needs `allowBuilds.esbuild` (see pnpm). Generated MSW handlers work with MSW 3 (type check).

**Verification status:** docs-confirmed and installed-verified (generation, imports, type check). Caveats: the measured config had no `hooks.afterAllFilesWrite`, so the hook is documented only. The type check ran on tsc 7.0.2 with `skipLibCheck: true` and without `@types/react`.

### Playwright

- **Library name:** `@playwright/test`
- **Context7 library ID:** `/microsoft/playwright/v1.64.1`, version-pinned but older (1.65 is not in Context7)
- **Selected version:** 1.65.1 (2026-11-13); the CLI's own devDependency `playwright` is also 1.65.1 · **Documentation version:** v1.64.1, plus the GitHub release notes for v1.65.0 · **Research date:** 2026-11-24
- **Query topic:** `defineConfig` with `webServer`, CI options and `projects`; browser install in CI; 1.65 release notes
- **Official documentation URL:** https://playwright.dev/docs/test-configuration , https://playwright.dev/docs/test-webserver

**Confirmed configuration**

```ts
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: { baseURL: "http://localhost:4173", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
})
```

- In CI, install browsers with `npx playwright install --with-deps chromium`. For headless-only runs, add `--only-shell`.

**Deprecated APIs / breaking changes**

- `webServer.port` is deprecated; use `url`.
- 1.65 behavior changes: TS class fields follow `useDefineForClassFields`, a shard run with no matching tests fails (`--pass-with-no-tests`), and actions wait on `inert` elements.

**Compatibility considerations:** engines `node >=20`. No install script, so no `allowBuilds` entry is needed. Bun support is new in 1.65. The `['github']` reporter was not re-checked (unconfirmed).

**Verification status:** docs-confirmed; nothing was executed.

### pnpm

- **Library name:** `pnpm`
- **Context7 library ID:** `/pnpm/pnpm/v12.15.0`, version-pinned; older than the researched 12.23.0
- **Selected version:** **`dependency-versions.json` pins 11.13.0.** The infra research measured 12.23.0 (npm `latest`, 2026-11-22), and the 11.x claims below come from the v11.0.0 release notes. · **Documentation version:** v12.15.0 · **Research date:** 2026-11-24
- **Query topic:** `allowBuilds`, v12 changes, `pmOnFail`/`devEngines.packageManager`, `minimumReleaseAge`, filtered install, catalog, `pnpm create`
- **Official documentation URL:** https://pnpm.io/settings , https://pnpm.io/11.x/migration , https://github.com/pnpm/pnpm/releases/tag/v12.0.0 , https://github.com/pnpm/pnpm/releases/tag/v11.0.0

**Confirmed configuration**

```yaml
# pnpm-workspace.yaml (omit packages for a standalone project)
packages: [apps/*, packages/*]
catalog: { react: 19.3.1 }
allowBuilds:
  esbuild: false # orval → @orval/core → esbuild; true also works
```

- In pnpm 11+, settings live in `pnpm-workspace.yaml`. `.npmrc` holds only registry and auth, and `package.json#pnpm` is ignored.
- **Measured on 12.23.0:**
  1. **Build scripts:** the first install with orval exited 1 with `ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: esbuild@0.28.2`. Vite 8.3.8 lists esbuild only as an optional peer, so orval is what installs it. `allowBuilds: { esbuild: false }` makes install exit 0 with or without orval, so the generator can always write it. The docs mention placeholder entries, but 12.23.0 wrote none.
  2. **Release age:** a standalone install _created_ `pnpm-workspace.yaml` and listed packages less than a day old under `minimumReleaseAgeExclude`. The git tree is dirty after the first install.
  3. **Unknown and misspelled keys:** a removed key (`onlyBuiltDependencies`) was ignored, while a typo (`minimumReleaseAg`) exited 1.
  4. **Filtered install:** `pnpm install --filter web...` also runs the root `postinstall` and `prepare`.
- **Version pinning:** pin with `packageManager: "pnpm@x.y.z"` or `devEngines.packageManager`, never both. `pmOnFail: download` (the default) switches to the declared version.
- **CLI:** `pnpm create produx-app my-app --flag` and `pnx create-produx-app@latest my-app --flag` pass arguments through. The docs need no `--` there; this was not measured.

**Deprecated APIs / breaking changes**

- **10 → 11** (2026-04-28): Node 18–21 dropped, and `npm_config_*` became `pnpm_config_*`. `onlyBuiltDependencies` and its siblings were replaced by **`allowBuilds`**, with `strictDepBuilds` defaulting to `true`. `minimumReleaseAge` defaults to 1440 minutes. `managePackageManagerVersions` and its siblings were replaced by **`pmOnFail`**.
- **11 → 12** (2026-08-26): unknown `pnpm-workspace.yaml` keys fail with `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` when the project pins a matching pnpm. `--frozen-lockfile false` → `--no-frozen-lockfile`.

**Compatibility considerations:** pnpm 11 needs `engines.node >=22.13`. pnpm 12 is a native executable; that it needs no Node is an inference. With `packageManager` set, the lockfile gains a boot document, and `lockfileVersion` stays `'9.0'`.

**Verification status:** docs-confirmed, from changelog, and installed-verified on 12.23.0 only. These notes contain no measurements on 11.13.0.

### Renovate

- **Library name:** Renovate custom managers (compared with Dependabot)
- **Context7 library ID:** not queried, quota exceeded
- **Selected version:** not a project dependency; researched Renovate 44.259.0 (2026-11-24), which uses `jsonata` 2.2.1 · **Documentation version:** `lib/modules/manager/custom/jsonata/readme.md` and source `auto-replace.ts` · **Research date:** 2026-11-24
- **Query topic:** Tracking `src/config/dependency-versions.json`
- **Official documentation URL:** https://docs.renovatebot.com/modules/manager/jsonata/ , https://docs.renovatebot.com/modules/manager/regex/

**Confirmed configuration**

```json
{
  "customType": "jsonata",
  "fileFormat": "json",
  "managerFilePatterns": ["/^src/config/dependency-versions\\.json$/"],
  "matchStrings": ["$each($, function($v, $k) { { \"depName\": $k, \"currentValue\": $v } })"],
  "datasourceTemplate": "npm"
}
```

- **Validation:** the snippet is one entry of `customManagers`. `renovate-config-validator` accepted the full config built from it (with `$schema`) and the regex alternative. `--dry-run=extract` found `react` and `react-dom` as npm dependencies.
- **Regex alternative:** `"matchStrings": ["\"(?<depName>[^\"]+)\"\\s*:\\s*\"(?<currentValue>[^\"]+)\""]`.
  - Its `replaceString` includes the name, so duplicate versions (two `19.3.1` entries) are unambiguous.
  - jsonata handles duplicates by re-extracting and retrying (source).
- If you use `enabledManagers`, add `custom.jsonata` or `custom.regex` to it.

**Deprecated APIs / breaking changes:** None recorded.

**Compatibility considerations:** Dependabot cannot track arbitrary JSON files. This is prior knowledge and is unconfirmed.

**Verification status:** docs-confirmed and installed-verified (validator and extract). No real update PR was produced.

### Turborepo

- **Library name:** `turbo`
- **Context7 library ID:** `/vercel/turborepo/v2.11.10`, version-pinned but older
- **Selected version:** 2.11.13 (2026-11-18) · **Documentation version:** v2.11.10 · **Research date:** 2026-11-24
- **Query topic:** `turbo.json` tasks, dependsOn, outputs, inputs, persistent and cache; package manager requirement; env modes
- **Official documentation URL:** https://turborepo.dev/docs/reference/configuration

**Confirmed configuration**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", ".env*"], "outputs": ["dist/**"] },
    "lint": {},
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- The schema URL is on `turborepo.dev`, not the old `turbo.build`.
- The root `package.json` must declare a package manager; the docs prefer `devEngines.packageManager`.
- `envMode` defaults to `strict`, and Vite packages get `VITE_*` automatically.
- The local cache works without login (`FULL TURBO`). Disable telemetry with `TURBO_TELEMETRY_DISABLED=1`.

**Deprecated APIs / breaking changes:** None recorded.

**Compatibility considerations:** The release notes cover pnpm 11 multi-document lockfiles and pnpm 12 native binaries. Outside a git repository, the cache hit only from the third run; the probable cause is that `dist/` entered the input hash (inference).

**Verification status:** docs-confirmed and installed-verified (pnpm 12.23.0 workspace, `FULL TURBO` on rerun).

### Yarn

- **Library name:** Yarn 4 (berry)
- **Context7 library ID:** not queried, quota exceeded
- **Selected version:** not a selected dependency; researched `@yarnpkg/cli-dist@4.19.0` (2026-11-21). The npm `yarn` package is still 1.22.22. · **Documentation version:** source `yarnpkg/berry` `packages/plugin-dlx/sources/commands/create.ts` · **Research date:** 2026-11-24
- **Query topic:** `yarn create` arguments, default config values, PnP with Vite
- **Official documentation URL:** https://yarnpkg.com/cli/create

**Confirmed configuration**

- `yarn create foo my-app --flag` runs `yarn dlx create-foo` and forwards all arguments, with no `--` needed (source).
- **Defaults in 4.19.0:** `nodeLinker` is `pnp`. **`enableScripts` is `false`,** so esbuild prints `YN0004`, which is not a failure. **`npmMinimalAgeGate` is `1440`.**
- **PnP:** `vite build` succeeded under the default PnP linker. Other tools were not checked, so `nodeLinker: node-modules` is the safe choice (opinion, not measured).

**Deprecated APIs / breaking changes:** **Age gate:** pinning a version published less than a day ago fails with `YN0016 ... quarantined` (exit 1), while pnpm falls back instead. Pinning just-released versions breaks Yarn mode.

**Compatibility considerations:** `node:26.13.1-alpine3.24` has no corepack. Vitest 5 makes `vite` a required peer, and Yarn does not install peers, so list `vite` directly.

**Verification status:** from changelog (release and source) and installed-verified (4.19.0 install, PnP build, defaults, age gate).

---

## Architecture refactor (2026-11-24)

Context7's monthly quota was exhausted; these facts come from the installed packages of a generated Enterprise app (`node_modules`, `.d.ts`, templates) and from runs in that app. Background research on Feature-Sliced Design and the enforcement tools was done from official sources and recorded during the analysis.

### Storybook 10.6.8 with Vitest 5.1.1

- `@storybook/addon-vitest@10.6.8` peers: `vitest ^4 || ^5`, `@vitest/browser ^4 || ^5`, `@vitest/browser-playwright ^4 || ^5`, `storybook ^10.6.8` (`npm view`). `@vitest/browser` is therefore pinned explicitly (5.1.1).
- The addon's own setup template for Vitest 4+ (`node_modules/@storybook/addon-vitest/templates/vitest.config.4.template.ts`) adds a `test.projects` entry with `extends: true`, `storybookTest({ configDir })` and `browser: { enabled: true, headless: true, provider: playwright({}), instances: [{ browser: "chromium" }] }`. It has no `setupFiles`: project annotations are applied by the plugin. Generated apps follow that shape inside `vite.config.ts`, next to a `unit` project, so the Storybook UI's test runner finds it.
- `storybook build` and the story tests used the app's `vite.config.ts` plugins and `@/` alias without extra `viteFinal` configuration (measured: build and 20 story tests passed, including stories importing `@/shared/lib/theme`).
- `parameters.a11y.test: "error"` makes axe violations fail story tests (measured: the `destructive` button and badge failed at 4.0:1 contrast until the token was changed).
- `core.disableTelemetry: true` turns off usage telemetry (the build otherwise prints the telemetry notice).

### eslint-plugin-boundaries 7.4.4

- Element descriptors' `mode` option is deprecated (`@boundaries/elements` 3.3.4 `dist/index.d.mts`: "For element descriptors, the mode is always folder"); a run with `mode: "file"` printed a deprecation warning. Single files (`src/main.tsx`, `src/vite-env.d.ts`) are therefore listed in `boundaries/ignore` instead of being an element.
- Element patterns use the default right-to-left `partialMatch`, but paths are taken relative to `boundaries/root-path`, which defaults to `process.cwd()` (`dist/Settings/Settings.js`, `getNormalizedRootPath`; an absolute setting is used as is). Measured from a monorepo root: `boundaries/ignore` entries such as `src/main.tsx` no longer matched and every app file was reported by `no-unknown-files`. Generated configs set `"boundaries/root-path": import.meta.dirname` (see 2026-11-25 below).
- Measured with a canary file in a generated app: deep imports into another page, imports of another page's index, a page importing `app`, `shared` importing a page, a relative import into another slice, an app-level deep import and a dynamic `import()` of a page's internal file were all reported; a file outside every layer was reported by `boundaries/no-unknown-files`.

### Orval 8.49.0 function clients

Generated in a scratch copy with the app's mutator:

- `client: "axios-functions"` with a mutator: `listTodos(params?, options?)` returns `orvalRequest<Todo[]>(...)`, i.e. the data.
- `client: "fetch"` with a mutator: `listTodos(params?, options?: RequestInit)` returns `{ data, status, headers }` (`listTodosResponse`); non-2xx variants are part of the union (`updateTodoResponse404`).
- Models are written to `schemas` with an `index.ts` (`Todo`, `NewTodo`, `TodoPatch`, `ListTodosParams`, ...).

### TanStack Router 1.170.46: missing chunks

`dist/esm/lazyRouteComponent.js` reloads the page once when a lazy route module fails to load (`isModuleNotFoundError`, guarded by a `sessionStorage` key `tanstack_router_reload:<message>`); the second failure is thrown to the route's error component. React Router shows the route `ErrorBoundary` on the first failure.

## Cross-platform validation (2026-11-25)

Facts from the installed packages, the pinned actions' sources and the runs on GitHub Actions and in Docker (Context7 quota still exhausted).

- **pnpm/action-setup v6.1.1** (README at the pinned SHA): `version` may be omitted only when `package.json` declares pnpm 11+ in `packageManager` or `devEngines.packageManager`. **pnpm 11.13.0** is deprecated on npm ("This is a broken version. Please install pnpm v11.13.1 or newer", `npm view pnpm@11.13.0 deprecated`); the action's self-installer refuses it with `ERR_PNPM_BROKEN_PNPM_RELEASE`.
- **Corepack** (bundled with Node 22.23.2, Debian container): on first use it prints `! Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-<version>.tgz` on stderr before running the command.
- **execa 10.2.1** (`lib/arguments/command-file.js`): on Windows it resolves the command through `PATH` and `PATHEXT` and escapes arguments for `cmd.exe`, so `.cmd` shims (pnpm, npm) run without a shell; `node:child_process` resolves neither.
- **@testing-library/jest-dom 8.0.0**: the `./vitest` entry (`dist/vitest.mjs`) runs `import { expect } from 'vitest'; expect.extend(...)`; `./matchers` does not import vitest. The README documents `import * as matchers from '@testing-library/jest-dom/matchers'` + `expect.extend(matchers)` for other `expect`s.
- **Windows short paths** (measured on `windows-latest`): `os.tmpdir()` is `C:\Users\RUNNER~1\AppData\Local\Temp`. A project run from there with the alias based on `import.meta.dirname` failed in Vitest: test files were loaded by the long path (`C:/Users/runneradmin/...`), `@/` imports by the short one (`ERR_MODULE_NOT_FOUND`). With the alias on `realpathSync.native(...)` the modules loaded, but every jest-dom matcher was `Invalid Chai property`, also after making Vite's `root` the real path. Only registering the matchers on the setup file's own `expect` made the scenario pass. That jest-dom's `./vitest` entry had extended a second copy of Vitest's `expect` is an inference from that sequence, not a measurement.
- **Debian containers** (measured in `node:22.23.2-bookworm`): `vite preview` listened on 127.0.0.1 while Node's `fetch("http://localhost:…")` connected to `::1` (`ECONNREFUSED`; `curl` succeeded by falling back).

## Verification tooling (2026-11-26)

Context7 quota still exhausted: fast-check from its installed `.d.ts`, Claude Code from code.claude.com/docs (permissions, hooks, skills, sandboxing, code-review-customize) and measurements in this repository.

- **fast-check 4.11.0** (`lib/fast-check.d.ts`; ESM default export `fc`): `fc.assert(property, params?)` throws on failure; `fc.property(...arbitraries, predicate)` fails when the predicate throws or returns `false`. A predicate written as `(x) => expect(...).toBe(...)` returned a falsy value under Vitest 5.1.1 and failed every run, so predicates use a block body. `fc.string({ unit, minLength, maxLength })` (`unit` defaults to `"grapheme-ascii"`); `fc.oneof` takes `{ weight, arbitrary }` entries; `fc.option(arb, { nil: undefined })`; `fc.subarray`; `numRuns` defaults to 100.
- **Claude Code 2.1.332, permissions**: `Read(.env)` matches `.env` at any depth (`./.env` only in the current directory) and also blocks Edit and Write of that path. Measured in a bypass-permissions session: the Read tool and `cat` were refused for `sub/.env` and `.env.local`.
- **Hooks**: a hook added to `.claude/settings.json` during a session ran on the next tool call. PostToolUse input has `tool_input.file_path`, `session_id`, `transcript_path`, `cwd`; exit 2 shows stderr to Claude. A Stop hook's exit 2 kept a headless session working and its stderr reached Claude; the documented cap is eight consecutive Stop blocks. A PreToolUse `"if": "Bash(git commit *)"` still ran the hook for compound commands that were not commits (measured), so the gate also matches the command itself.
- **Skills**: a project skill named `verify` replaces the bundled `/verify` (docs). A skill directory created during a session was not available to the Skill tool in that session (the bundled skill answered); a new headless session listed the project skill.
- **REVIEW.md**: read by the managed GitHub Code Review from the base branch, never from the pull request; the local `/code-review` reads `CLAUDE.md`, not `REVIEW.md` (docs).
- **Sandbox**: off by default; `docker` is documented as incompatible; in bypass-permissions mode a domain outside `allowedDomains` is allowed without a prompt (docs). Not enabled here.

## Selected versions without a dedicated section

| Package                            | Selected     | Where the research touches it                                                     |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `react`, `react-dom`               | 19.3.1       | Build and type-check baseline. react-router 8 peers `>=19.2.7`.                   |
| `@types/react`, `@types/react-dom` | 19.3.0       | `@types/react` was in the type-check baseline. `@types/react-dom` is not covered. |
| `@types/node`                      | 22.20.5      | Needed for `import.meta.dirname` in `vite.config.ts`                              |
| `vite`, `@vitejs/plugin-react`     | 8.3.8, 6.3.0 | Build baseline; see the notes below                                               |
| `typescript`                       | 6.0.3        | Key decisions; the TS5101 `baseUrl` error                                         |
| `sonner`                           | 2.0.8        | Not covered by the research notes                                                 |
| `pnpm`                             | 11.13.0      | The pnpm section was measured on 12.23.0                                          |

The shadcn registry packages (`cn`, `class-variance-authority`, `tw-animate-css`, `lucide-react`, `@fontsource-variable/geist`, `@base-ui/react`, `radix-ui`) are listed in the shadcn CLI section.

**Vite 8.3.8 notes:**

- An ESM `vite.config.ts` without `"type": "module"` warns about `configLoader: 'native'`. Generated projects set `"type": "module"`.
- esbuild is only an optional peer, Rolldown is the bundler, and the Yarn PnP build worked.

## Unconfirmed and open items

1. **Ctrl+C and Node coverage:** for the clack spinner, the docs and the measurement disagree. Ctrl+C was measured on macOS only (`scripts/interactive-check.py`), not on Linux, Windows or with an external SIGINT. Vitest with jsdom 31 ran on Node 22.23.2 and 24.21.0 (Linux, Docker) and 26 (macOS, GitHub Actions on Linux, macOS and Windows).
2. **Unmeasured CLI paths:** clack `validate` with a zod 4 schema, and a tsdown shebang injected through `banner`.
3. **shadcn `init` output** was not measured in the quality-tool research. Still open: whether it runs without prompts, whether `-t vite` adds `button`, whether `shadcn@latest` is written to dependencies, and which dark variant the CSS uses.
4. **Hooks and docs versions:** no husky or lint-staged hook was run on a real commit. The Tailwind docs came from `main`, and Prettier 3.10 changes were not researched.
5. **App libraries:** the TanStack Router plugin-order failure was not reproduced, the query key factory is unconfirmed, and the zustand persist behavioral change was not read.
6. **Infrastructure:** the MSW Vite plugin, a Renovate update PR and the full Docker build were not run. Also unconfirmed: the Playwright `['github']` reporter, the CodeQL language ID, the Dependabot limitation, and whether npm 11 blocks lifecycle scripts.

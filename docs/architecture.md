# Architecture

One CLI and one generation engine serve all three project modes. The design keeps every decision in pure functions and leaves side effects to a thin pipeline at the edge.

```text
argv ──► cli/options.ts ──► (interactive: cli/prompts.ts) ──► core/resolve-config.ts ──► ProjectConfig
                                                                     │   uses core/resolve-features.ts
                                                                     ▼
                         core/generate.ts  (templates + package.json + pnpm-workspace.yaml) ──► Plan
                                                                     ▼
              core/run.ts: review → confirm → core/apply.ts (staging, journal) → git init → install → format → validate → report
```

## Modules

| Module                                | Responsibility                                                                                                                                 | Side effects     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `src/cli/options.ts`                  | Commander definition, option conflicts → `CliOptions`                                                                                          | none             |
| `src/cli/prompts.ts`                  | Asks only what flags and config did not decide (@clack/prompts)                                                                                | terminal         |
| `src/core/config-schema.ts`           | `produx.config.json` schema (Zod, strict), versioning, stable serialization                                                                    | none             |
| `src/core/features.ts` / `presets.ts` | Feature registry (declarative data) and presets                                                                                                | none             |
| `src/core/resolve-features.ts`        | Requirements, one-of, conflicts, cycles, modes, package managers, verification status                                                          | none             |
| `src/core/resolve-config.ts`          | Precedence: CLI > config file > preset > defaults; router/UI mapping                                                                           | none             |
| `src/core/workspace.ts`               | Workspace detection (root, package manager, globs, lockfiles, Turborepo, git root, lifecycle scripts, overrides, catalogs) and safe YAML edits | reads files      |
| `src/core/template.ts`                | Line-directive preprocessor (`@if` / `@else` / `@endif`) and `{{var}}` substitution                                                            | none             |
| `src/core/flags.ts`                   | Template flags: feature ids plus derived flags (`router`, `api-client`, `ui-radix`, ...)                                                       | none             |
| `src/core/generate.ts`                | Merges template layers into a `Plan`; refuses two layers writing the same file                                                                 | reads templates  |
| `src/core/package-json.ts`            | App, root and shared-package manifests with pinned versions and scripts                                                                        | none             |
| `src/core/apply.ts`                   | Target checks, staging + rename, `Journal` for rollback                                                                                        | writes files     |
| `src/core/run.ts`                     | Pipeline orchestration and reporting                                                                                                           | processes, files |
| `src/adapters/package-manager.ts`     | Commands per package manager, user-agent detection                                                                                             | none             |
| `src/utils/exec.ts`                   | `execa` with argument arrays, no shell, stdin ignored                                                                                          | processes        |

## Templates

```text
templates/
  base/{app,root,monorepo}/         always
  features/<id>/{app,root,monorepo}/
  features/<id>/examples/app/       only with examples
  features/<id>/when-<flag>/...     only when <flag> is set (e.g. when-ui-radix)
  shared/ai-rules.md                rendered into AGENTS.md / CLAUDE.md
```

- `app/` goes to the app directory; `root/` to the project root (the app directory in standalone mode, the app directory again in an existing workspace, except `.github/` and `.husky/`, which are skipped there); `monorepo/` only to a new monorepo's root.
- `dot_` prefixes become `.` (npm drops some dotfiles from packages).
- Files are composed with line directives in the file's own comment syntax (`// @if a && !b`, `{/* @if x */}`, `# @if`, `<!-- @if -->`, `/* @if */`). Malformed expressions and unknown variables throw; files that render empty are skipped.
- Two layers producing the same path is an error. Shared files (for example `vite.config.ts`, `App.tsx`) use directives instead of overrides, so each feature's contribution is visible in one place.

## Same features in every mode

Features do not know about modes. `Target` carries `rootDir` and `appDir` separately (equal in standalone mode), and the template layer decides where a file lands. Root-level tooling (Husky, lint-staged, Turborepo) moves to the root package.json in workspaces.

## Pipeline order

1. Parse options; detect a workspace when relevant; load the config file.
2. Prompt (interactive only), then resolve the configuration and the target.
3. Check the target (missing or empty, writable, inside the workspace after resolving symlinks).
4. Build the plan; compute workspace changes; print the review.
5. Refuse unapproved workspace changes in `--yes` mode; confirm interactively.
6. Write through a staging directory; apply approved root edits through the journal.
7. `git init` (before install, so Husky can install hooks), install, generate code (Orval), format (Prettier), validate.
8. Report each step as passed, failed or skipped; exit 1 on any failure.

Ctrl+C after writing starts a rollback of everything the journal recorded (created directories, modified files, the lockfile of an existing workspace).

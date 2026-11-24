# Contributing

## Setup

```bash
pnpm install
pnpm build          # dist/index.mjs
node dist/index.mjs my-app --dry-run
```

Node.js 22.22+ is required to run the tests (they execute the CLI from TypeScript source with Node's type stripping); Node.js 26 is recommended.

## Before opening a pull request

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:run && pnpm build
```

If you changed templates, features, presets or pinned versions, also run the affected validation scenarios (they install real projects and take minutes each):

```bash
node scripts/validate.ts --browser --only standard,mono-turbo,existing-standard
```

## Adding a feature

1. Add a `FeatureDef` to `src/core/features.ts`: packages, `requires`, `requiresOneOf`, `conflicts`, `modes`, `packageManagers`, scripts. Pin new packages in `src/config/dependency-versions.json` after checking peers and engines.
2. Add files under `templates/features/<id>/{app,root,monorepo,examples/app}`. Edit shared files (for example `templates/base/app/vite.config.ts`) with `@if <id>` blocks instead of overriding them.
3. Add or extend a scenario in `scripts/scenarios.ts`. `tests/unit/resolve-features.test.ts` fails while a selectable feature is not exercised by any scenario; mark it `unverified: true` until it is.
4. Regenerate `docs/features.md` and update `docs/presets.md` if presets change.

Template rules: one directive per line; keep files lint-clean without autofix; never reference a package that the feature does not install (a unit test greps for this); keep generated code free of `any`, `@ts-ignore` and blanket `eslint-disable`.

## Commit messages

Conventional style (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) in English.

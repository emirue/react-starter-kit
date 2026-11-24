# Releasing and updating dependencies

## Updating generated-project dependencies

1. Renovate opens one grouped PR for `src/config/dependency-versions.json` (majors wait for approval on the dependency dashboard). Locally, `node scripts/check-versions.ts` lists what is behind.
2. For each update read the changelog and check peer dependencies and `engines` (`npm view <pkg>@<version> peerDependencies engines --json`).
3. If shadcn/ui changed, run `scripts/vendor-shadcn.sh` and review the diff.
4. Run the full validation:

   ```bash
   pnpm typecheck && pnpm lint && pnpm test:run && pnpm build
   npm pack
   node scripts/validate.ts --browser --shadcn-add --cli <installed tarball bin>
   python3 scripts/interactive-check.py
   ```

5. Update `docs/dependency-compatibility.md` and `docs/validation-report.md`. Never merge an update whose validation failed; the CLI never switches to unverified versions at generation time.

Known holds: TypeScript stays on 6.0.x until typescript-eslint supports 7 (Renovate is limited to `<6.1.0`); `@types/node` follows the oldest supported Node.js major (22).

## Release checklist

- [ ] `CHANGELOG.md` and `package.json` version updated.
- [ ] Full validation green, results committed.
- [ ] `npm pack --dry-run` lists `dist/index.mjs`, `templates/**`, `README.md`, `LICENSE`.
- [ ] Tarball installed outside the repository and used to create Standalone, New Monorepo and Existing Workspace projects.
- [ ] CI green on Linux, macOS and Windows.
- [ ] Maintainer approval, then `npm publish` and a GitHub release. These steps are never automated without approval.

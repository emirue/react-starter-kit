---
name: verify
description: Verify a create-produx-app change by running it, not only its tests. Runs the fast checks, generates and checks the projects the change affects, uses the CLI the way a user would, and applies the REVIEW.md items for the touched files. Use before every commit and before saying that a change works.
---

# Verify a create-produx-app change

Passing unit tests is not enough. Build the CLI, generate the projects the change affects and check them. Report what
ran, with numbers.

## 1. Fast checks (always)

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:run && pnpm build
```

## 2. Generate real projects

Pick scenarios from the changed files. Names are in `scripts/scenarios.ts`; preset contents are in
`src/core/presets.ts`.

| Changed                                                     | Scenarios                                                                                      | Also                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/core/run.ts`, `src/core/apply.ts`, `src/utils/exec.ts` | `minimal`, `existing-install-unapproved`                                                       | `python3 scripts/interactive-check.py`; 3 runs if cancel or rollback |
| `src/core/workspace.ts`, `src/core/package-json.ts`         | `existing-standard`, `existing-unlisted-dir`, `existing-unlisted-dir-approved`, `mono-app-dir` |                                                                      |
| `src/adapters/`, package-manager handling                   | `standard`, `standard-npm`, `standard-yarn`, `standard-bun`, `mono-turbo`                      |                                                                      |
| `src/core/resolve-*.ts`, `src/cli/`                         | `minimal`, `standard`, `mono-turbo`, `existing-standard`                                       | interactive check if `src/cli/prompts.ts` changed                    |
| `templates/base/**`                                         | `minimal`, `standard`, `enterprise`, `mono-enterprise`, `custom-primitives-no-tailwind`        | `--browser`                                                          |
| `templates/features/<id>/**`                                | the scenarios whose preset or `--features` include `<id>`, with the feature on and off         | `--browser` for UI; `--shadcn-add` for shadcn/ui                     |
| design tokens, CSS, color classes                           | `standard`, `enterprise`, `custom-primitives-no-tailwind`                                      | `--browser`                                                          |
| `scripts/validate.ts`, `scripts/scenarios.ts`               | `minimal` and one scenario that runs the changed check                                         |                                                                      |
| `package.json`, the build                                   | step 4                                                                                         |                                                                      |

```bash
node scripts/validate.ts --only <a,b> [--browser] --out "${TMPDIR:-/tmp}/produx-verify.json"
```

- Always pass `--out`. The default rewrites `docs/validation/results.json`, which changes only in a release
  validation (`docs/releasing.md`).
- Every scenario prints `PASS (n checks)` and the exit code is 0. For a FAIL read the detail and the log directory
  printed on the last line.
- Docker checks print SKIPPED without a Docker daemon: report them as not tested.
- Afterwards `pgrep -fl produx-validate` prints nothing. A leftover server is a defect (REVIEW.md item 1).

## 3. Use the CLI the way a user does

For changes to options, prompts, the review screen or messages, run the built CLI in an empty directory and read the
output and the exit code for the case you changed and for one invalid input:

```bash
cd "$(mktemp -d)" && node <repo>/dist/index.mjs my-app --yes --no-install --no-git [options]
```

## 4. The package (`package.json`, `bin`, `files`, the build)

```bash
npm publish --dry-run                      # no warnings
npm pack --pack-destination "${TMPDIR:-/tmp}"
```

Install the tarball outside the repository, then run
`node scripts/validate.ts --cli <installed bin> --only minimal,mono-turbo,existing-standard --out <scratch json>`.

## 5. REVIEW.md

Read `REVIEW.md`, pick the checklist items whose "When" matches the diff, and run their checks.

## 6. Report and commit

- List each command with its result, for example `pnpm test:run` 278/278 and
  `validate.ts --only minimal,standard` 2/2 scenarios. Write NOT TESTED, with the reason, for anything not run.
- Add a trailer to the commit message: `Verified: /verify (<commands and numbers>)`.
- When a check fails, fix the cause and run it again. Do not rerun hoping it passes, add sleeps or skip tests. After
  three failed attempts, stop and report what failed and what you tried.

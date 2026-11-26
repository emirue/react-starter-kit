# AGENTS.md

Rules for coding agents working on create-produx-app (the CLI itself, not the projects it generates).

## Layout

- `src/cli/` argument parsing and prompts; `src/core/` pure resolution, generation and the pipeline; `src/adapters/` package managers; `src/utils/` helpers.
- `templates/` holds generated-project files with `@if` directives. They are not compiled or linted here; they are validated by generating projects.
- `scripts/validate.ts` + `scripts/scenarios.ts` are the end-to-end validation harness. `docs/validation/results.json` is its evidence; do not edit it by hand.

## Rules

1. Read `docs/architecture.md` before changing the pipeline or the template system.
2. Keep resolution pure: options, config and detection in → `ProjectConfig` out. Side effects stay in `core/run.ts`, `core/apply.ts` and `utils/exec.ts`.
3. Run external commands with argument arrays through `utils/exec.ts`; never build shell strings from user input.
4. Never write outside the target, never overwrite existing files, and route every change to an existing workspace through the review and approval path.
5. Verify library APIs against official documentation or the installed `.d.ts` for the pinned version; record findings in `docs/research/context7-references.md`.
6. Write a failing test first for behaviour changes. Do not weaken assertions or skip tests to get green.
7. Never mark a feature, package manager or platform as supported without a passing scenario; report unrun checks as NOT TESTED.
8. A test that passes on one run and fails on another has a cause: find it. Do not rerun until it passes, add sleeps or retries, or skip it. If the cause cannot be found, stop and ask; a test is removed only with the maintainer's approval and the reason in the commit message.

## Validation

Run `/verify` (`.claude/skills/verify/SKILL.md`) before every commit: fast checks, then the affected scenarios with
`node scripts/validate.ts --only <scenarios> --out <scratch json>`, then the `REVIEW.md` items for the touched files.

- Commit messages end with `Verified: /verify (<commands and numbers>)`, or `Verified: none (<reason>)`.
- When a check still fails after three attempts, stop and report what failed and what you tried.
- Reviews use the severity labels and the checklist in `REVIEW.md`.
- `.claude/settings.json` runs the hooks in `.claude/hooks/`: format and lint check after each edit, the fast checks
  before Claude finishes, and a commit gate in observe mode (log in `.git/claude-commit-gate.jsonl`).

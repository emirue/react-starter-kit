# CLAUDE.md

<!-- @if agents-md -->
@AGENTS.md
<!-- @else -->
Workspace-level guidance for Claude Code. Each app has its own `CLAUDE.md`.

- Package manager: {{pm}}. Install from the root only.
- Apps live in `apps/`, shared packages in `packages/` (linked with `workspace:*`).
- Change only the app or package your task is about.
- Validate with `{{pmRun}} typecheck`, `{{pmRun}} lint`, `{{pmRun}} test` and `{{pmRun}} build`.
<!-- @endif -->

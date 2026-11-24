# AGENTS.md

Workspace-level guidance for coding agents. Each app has its own `AGENTS.md`
with app-specific rules; read it before changing that app.

## Workspace rules

- Package manager: {{pm}} (workspace root `{{projectName}}`). Install from the root only; never create lockfiles inside apps or packages.
- Apps live in `apps/`, shared packages in `packages/`. Shared packages are referenced with `workspace:*`.
- Shared runtime packages must stay browser-safe: no Node.js modules, database code or server secrets.
- Change only the app or package your task is about. Do not modify other apps or backend code unless asked.
- Add a dependency to the package that imports it, not to the root.

## Validation

```bash
{{pmRun}} typecheck
{{pmRun}} lint
{{pmRun}} test
{{pmRun}} build
```

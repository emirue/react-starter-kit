# Configuration files

`--save-config` writes the resolved choices; `--config` loads them for the next project.

```json
{
  "schemaVersion": 1,
  "mode": "monorepo",
  "packageManager": "pnpm",
  "preset": "standard",
  "features": ["tailwind", "lucide", "shadcn", "theme", "tanstack-query", "react-router", "axios", "vitest", "eslint"],
  "ui": { "base": "base", "style": "nova" },
  "workspace": { "appName": "web", "appDir": "apps/web", "turbo": true },
  "examples": true
}
```

| Key                                                        | Type                                               | Notes                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                                            | `1`                                                | Required. A newer version is rejected with an upgrade hint; older versions are migrated in `src/core/config-schema.ts`. |
| `mode`                                                     | `standalone` \| `monorepo` \| `existing-workspace` |                                                                                                                         |
| `packageManager`                                           | `pnpm` \| `npm` \| `yarn` \| `bun`                 |                                                                                                                         |
| `preset`                                                   | preset id                                          |                                                                                                                         |
| `features`                                                 | feature ids                                        | The full resolved list. When present it replaces the preset's list unless `--preset` is given on the command line.      |
| `ui.base` / `ui.style`                                     | `base` \| `radix` / `nova`                         |                                                                                                                         |
| `workspace.appName`, `workspace.appDir`, `workspace.turbo` |                                                    | `appDir`: letters, digits, `.`, `_`, `-`, `/`; relative; no `..`.                                                       |
| `examples`                                                 | boolean                                            | Default `true`.                                                                                                         |

Unknown keys are errors at every level, so typos and stray secrets are caught. The file stores no project name, absolute path, user name, token or password.

## Precedence

1. Command-line options
2. The imported config file
3. The selected preset
4. Global defaults

Conflicts are not resolved silently: for example `--package-manager npm` in an existing pnpm workspace is an error, and `--ui` without shadcn is an error.

## Reproducibility

The same CLI version and configuration produce the same files (verified by `tests/integration/cli.test.ts`, which compares two projects created from one saved config). Direct dependencies are pinned exactly; transitive versions are fixed by the lockfile the package manager writes. `packageManager` records the package manager version that ran the install.

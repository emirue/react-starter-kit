# Implementation plan and status

Phase record for 0.1.0. Status reflects what was run; see [validation-report.md](validation-report.md).

| Phase                             | Scope                                                                                  | Status                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Environment                    | Repository, git, Context7, Node.js and package managers                                | Done. Empty repository; work on `feat/create-produx-app`. Context7 quota ran out during research; official-source research approved by the user.                         |
| 1. Research and architecture      | Versions, compatibility, official scaffolds, design                                    | Done. [research/context7-references.md](research/context7-references.md), [dependency-compatibility.md](dependency-compatibility.md), [architecture.md](architecture.md) |
| 2. Core generator                 | Options, prompts, resolver, templates, safe writes, pipeline                           | Done                                                                                                                                                                     |
| 3. Standard standalone            | Tailwind, shadcn/ui, Query, Zustand, routers, API client, forms, tests, AI rules       | Done                                                                                                                                                                     |
| 4. Monorepo                       | New pnpm workspace (± Turborepo), shared packages, existing workspace, approvals       | Done (pnpm only)                                                                                                                                                         |
| 5. Custom and configuration reuse | Feature customization, config import/export, non-interactive, dry-run                  | Done                                                                                                                                                                     |
| 6. Admin                          | Sidebar layout, table, dialog, toasts, states                                          | Done (Base UI and Radix × both routers)                                                                                                                                  |
| 7. Enterprise                     | Error boundary, MSW, Orval, Playwright, Docker, GitHub Actions, CodeQL, env validation | Done; workflows checked with actionlint only                                                                                                                             |
| 8. Extended compatibility         | npm, Yarn, Bun, platforms                                                              | Partial: npm, Bun, Yarn 1 standalone PASS; Linux/Windows NOT TESTED                                                                                                      |
| 9. Packaging and validation       | npm pack, tarball install, full matrix                                                 | Done (local)                                                                                                                                                             |
| 10. Independent review            | Code and security review                                                               | See validation report                                                                                                                                                    |

## Deliberately out of scope for 0.1.0

- shadcn/ui styles other than `nova`.
- Monorepo modes with npm, Yarn or Bun.
- Shared packages inside existing workspaces.
- Orval without TanStack Query.
- Publishing to npm, creating GitHub releases, pushing to the remote (require the maintainer's approval).

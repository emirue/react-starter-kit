# Security Policy

## Supported versions

Only the latest released version receives security fixes.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories
("Report a vulnerability" on the repository's Security tab). Do not open a
public issue. Include the CLI version, the command you ran and, if possible, a
minimal reproduction. You should receive a response within a few working days.

## Scope

In scope:

- The CLI writing outside the target directory (path traversal, symbolic links).
- Command injection through project names, options or config files.
- Existing files being overwritten or deleted without approval.
- Secrets leaking into generated projects or saved configuration files.
- Insecure defaults in generated projects (for example the Nginx or GitHub
  Actions configuration).

Vulnerabilities in third-party dependencies of generated projects should be
reported to those projects; we update pinned versions once fixes are released.

## Design notes

- External commands run through `execa` with argument arrays; no shell is used.
- Target directories must be missing or empty; the CLI writes through a staging
  directory and rolls back on failure or Ctrl+C.
- In an existing workspace, writes are limited to the new app directory after
  resolving symbolic links. Root changes require explicit approval.
- `produx.config.json` rejects unknown keys and never stores absolute paths.

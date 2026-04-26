# Conventions

What belongs here: code style, naming patterns, folder rules, and any
project-wide convention we want to stay consistent on. Update when a new rule
is established (and remove rules that no longer apply).

## TypeScript
- `strict: true` is non-negotiable.
- Avoid `any`; prefer `unknown` + narrowing if the type is genuinely unknown
  at a boundary.

## Naming
- SQL: `snake_case` for tables and columns.
- TypeScript: `camelCase` for variables and functions; `PascalCase` for types
  and React components.
- Files: `kebab-case.ts` for server modules; component files match the
  component name (`MyThing.tsx`).

## Server-only modules
Files that import Node APIs (`fs`, `node:path`) or open native connections
(`better-sqlite3`) must put `import 'server-only'` at the top so a client
import fails the build. See `src/lib/db.ts`.

## Comments
Default to writing none. Add a comment only when the *why* is non-obvious — a
hidden constraint, a workaround for a specific bug, behavior that would surprise
a reader. Don't restate what the code does; don't reference the task that
prompted the change.

## When to update `README.md`
Update at milestone moments only — when a new visitor cloning the repo needs to
know:
- A feature works end-to-end → tick the Status checklist, add a screenshot if
  useful
- Setup steps changed → new env var, new service, new migration step
- Stack changed → swapped library, changed hosting
- A "why this approach" insight worth preserving for reviewers

Do NOT update for bug fixes, refactors, minor utilities, or mid-feature work.
README = current snapshot of the project, not commit history.

## When to update `docs/*.md`
Update the matching topical doc whenever a fact in it goes stale or a new fact
joins. Convention/decision changes go in `docs/conventions.md` or
`docs/decisions.md` respectively. CLAUDE.md should not need updates for topical
changes — only when the index itself or the documentation policy shifts.

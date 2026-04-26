# API

What belongs here: every route under `src/app/api/`, the HTTP method, the
request shape, the response shape, and any auth requirements. Update when a
route is added, removed, or its contract changes. One route = one short
section.

## Routes
*(none yet)*

## Conventions
- App Router route handlers in `src/app/api/<name>/route.ts`
- Request/response bodies are JSON unless explicitly noted (uploads are
  `multipart/form-data`)
- Errors return `{ error: string }` with appropriate HTTP status

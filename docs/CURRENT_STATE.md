# Current State

Verified on: 2026-03-01
Verifier: Codex

## Actual architecture

- This is not a frontend-only static app anymore.
- Frontend (`uni-app x`) and backend (`Express + MySQL`) coexist in this repo.
- JWT auth is active for protected endpoints (for example user favorites, social publish/upload).

## What is known good

- Frontend entry and route tree are present and complete.
- Backend route groups exist: `auth`, `user`, `cities`, `houses`, `jobs`, `companions`, `social`.
- Request interceptor exists in `utils/request.uts` and handles bearer token + 401 redirect.

## Drift and inconsistencies

1. Documentation drift (high)
- File: `ARCHITECTURE.md`
- Problem: Describes old "no backend/no auth" status.
- Action: Rewrite summary sections to match current API-based architecture.

2. Login API contract drift (high)
- Files: `server/API.md`, `server/src/routes/auth.js`, `pages/login/login.uvue`
- Problem: Docs describe password login; implementation uses code login.
- Action: Align docs and client wording with server behavior.

3. JWT env key mismatch (high)
- Files: `server/.env.example`, `server/src/routes/auth.js`, `server/src/middleware/authMiddleware.js`
- Problem: Example env uses `JWT_SECRET`; code reads `SECRET_KEY`.
- Action: Standardize one key across docs and code.

4. API base URL duplication (resolved on 2026-03-01)
- Files: `utils/api.uts`, `utils/request.uts`, multiple `pages/*`
- Result: base URL centralized and shared through `buildApiUrl(...)`.
- Follow-up: keep new API URL changes only in `utils/api.uts`.

5. Secrets hygiene risk (medium)
- File: `manifest.json`
- Problem: map keys are present in source.
- Action: evaluate key exposure policy for public repos/releases.

## Decision log (current)

- Keep this file as the "truth of now"; do not keep historical backlog here.
- Historical changes should be appended to `docs/HANDOFF.md`.

## How to keep this file fresh

- Update this file after any backend contract/auth/env strategy change.
- Include exact file references when adding new drift items.

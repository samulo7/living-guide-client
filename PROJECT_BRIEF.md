# Project Brief

Last updated: 2026-03-01

## Why this file exists

This is the single source of truth for fast onboarding.  
Any agent should read this file first before scanning the whole repo.

## Stack and shape

- Frontend: `uni-app x` (`Vue 3` + `UTS`) in repo root.
- Backend: `Node.js + Express + MySQL` in `server/`.
- Auth: JWT (`Authorization: Bearer <token>`).
- Platforms: H5 plus multi-end targets via uni-app.

## Repository map

- Frontend entry: `main.uts`, `App.uvue`, `pages.json`, `manifest.json`
- Frontend business pages: `pages/index`, `pages/detail`, `pages/sublet`, `pages/gigs`, `pages/social`, `pages/user`, `pages/login`
- Shared frontend logic: `utils/`, `components/`, `types/`, `static/`
- Backend entry: `server/server.js`
- Backend routes: `server/src/routes/*.js`
- DB scripts/schema: `server/db/`, `server/scripts/`

## Current runtime behavior

- Frontend calls backend APIs at `http://localhost:3000`.
- Login flow currently uses `phone + code` (`code` is fixed to `123456` in current implementation).
- Token is saved in storage key `token` and auto-attached in `utils/request.uts`.
- Some modules still have local JSON fallback data (`static/data/*.json`).

## Run commands

- Frontend install: `npm install`
- Frontend dev (H5): `npm run dev:h5`
- Frontend build (H5): `npm run build:h5`
- Backend install: `cd server && npm install`
- Backend dev/start: `cd server && npm run dev`

## Known mismatches to keep in mind

- `ARCHITECTURE.md` says "no backend/no auth", but repo now has backend + auth.
- `server/API.md` login description is password-oriented, but actual `/api/auth/login` is code-oriented.
- Backend code reads `SECRET_KEY`, while `server/.env.example` currently documents `JWT_SECRET`.
- `API_BASE_URL` is centralized in `utils/api.uts`; add new API domains there.

## Agent workflow (required)

When starting a new task, use this order:

1. Read `PROJECT_BRIEF.md`.
2. Read `docs/CURRENT_STATE.md`.
3. Read the latest entry in `docs/HANDOFF.md`.
4. Run `scripts/context-snapshot.ps1` only if fresh verification is needed.
5. Open source files only for the task scope.

## Update policy

Update this file when any of these change:

- Tech stack or deployment shape
- Auth mechanism
- API base strategy
- Directory ownership or key entry points

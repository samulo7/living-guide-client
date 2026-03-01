# Handoff Log

## 2026-03-01 - API base URL centralized

- Added `utils/api.uts` with `API_BASE_URL` and `buildApiUrl`.
- Removed duplicated `API_BASE_URL` constants from frontend pages and request utility.
- Updated affected pages to call `buildApiUrl(...)` for API and media URL assembly.
- Kept existing request behavior and endpoint paths unchanged.

## 2026-03-01 - Baseline context system added

- Added `PROJECT_BRIEF.md` as the first-read onboarding file.
- Added `docs/CURRENT_STATE.md` for verified real-time architecture and drift tracking.
- Added `scripts/context-snapshot.ps1` to generate a local context snapshot.
- Established startup workflow: brief -> current state -> handoff -> targeted code read.

## Entry template

Copy this block for future updates:

Date: YYYY-MM-DD
Owner: <name>
Summary:
- <what changed>
- <what changed>
Impact:
- <affected modules/files>
Validation:
- <what was tested or verified>
Risks/Follow-up:
- <known risk or next action>

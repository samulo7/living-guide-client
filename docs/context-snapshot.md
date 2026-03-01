# Context Snapshot

- Generated at: 2026-03-01 16:37:56 +08:00
- Repo root: `E:\go_demo\living-guide-client`
- Git branch: `main`
- Git commit: `9afc2c6`

## Stack

- Frontend: `uni-app x` + `Vue 3` + `UTS`
- Backend: `Express` + `MySQL`

## Frontend Scripts

- `build:h5`: `uni build`
- `dev:h5`: `uni`

## Backend Scripts

- `db:backup`: `node scripts/backup-db.js`
- `db:init`: `node scripts/init-db.js`
- `db:repair`: `node scripts/repair-db.js`
- `dev`: `node server.js`
- `start`: `node server.js`
- `start:safe`: `npm run db:backup && node server.js`

## Pages

- `pages/index/index`
- `pages/detail/detail`
- `pages/webview/webview`
- `pages/gigs/gigs`
- `pages/gigs/detail`
- `pages/sublet/index`
- `pages/sublet/detail`
- `pages/social/social`
- `pages/social/publish`
- `pages/social/detail`
- `pages/login/login`
- `pages/user/user`

## Backend Route Modules

- `auth`
- `city`
- `companion`
- `house`
- `job`
- `social`
- `user`

## Env Keys From `server/.env.example`

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BACKUP_DIR`
- `BACKUP_RETENTION_DAYS`
- `BACKUP_GZIP`
- `MYSQLDUMP_PATH`
- `OSS_REGION`
- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`
- `OSS_BUCKET`
- `OSS_ENDPOINT`
- `OSS_PUBLIC_BASE_URL`

## API Base URL Hardcoded References

- none found

## Notes

- Use this snapshot for quick orientation.
- Treat `PROJECT_BRIEF.md` + `docs/CURRENT_STATE.md` as source of truth.

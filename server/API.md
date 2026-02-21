# Living Guide Server API

Last updated: 2026-02-21
Last verified (local): 2026-02-21 13:02 (UTC+8)
Last verified (UTC): 2026-02-21T05:02:35Z

Base URL (local default): `http://localhost:3000`

## Auth

Protected endpoints require:

`Authorization: Bearer <token>`

Token is returned by:

- `POST /api/auth/register`
- `POST /api/auth/login`

## Endpoints

### `GET /api/health`

Health check.

Response `200`:

```json
{
  "ok": true,
  "message": "server is running"
}
```

### `POST /api/auth/register`

Register a new user.

Request body:

```json
{
  "phone": "13800000000",
  "password": "123456"
}
```

Response `201`:

```json
{
  "success": true,
  "token": "<jwt-token>",
  "user": {
    "id": 8,
    "phone": "13800000000",
    "username": "nomad0088",
    "avatar": "/static/logo.png",
    "tagline": "Start your nomad life today"
  }
}
```

Common errors:

- `400` invalid phone format or weak password
- `409` phone already registered
- `500` failed to register

### `POST /api/auth/login`

Login with phone and password.

Request body:

```json
{
  "phone": "13800000000",
  "password": "123456"
}
```

Response `200`:

```json
{
  "success": true,
  "token": "<jwt-token>",
  "user": {
    "id": 8,
    "phone": "13800000000",
    "username": "nomad0088",
    "avatar": "/static/logo.png",
    "tagline": "Start your nomad life today",
    "balance": "0.00"
  }
}
```

Common errors:

- `400` invalid/missing input
- `401` phone or password is incorrect
- `500` failed to login

### `GET /api/cities`

Fetch city list with optional search and filters.

Query params:

- `keyword`: fuzzy search on `name`
- `filter`: `under500 | seaside | mountain | lake | highspeed | hospitalA | verified`
- `maxRent`: `rent_price <= maxRent`
- `tag`: `tags LIKE %tag%`
- `verified`: `1` or `true` means verified only

Response `200`:

```json
{
  "ok": true,
  "total": 245,
  "items": [
    {
      "id": "19",
      "city": "Sample City",
      "district": "Sample District",
      "title": "Sample City - Sample District",
      "landscape": "mountain",
      "medical": "available",
      "transport": "highspeed,flight",
      "cover_image": "/static/covers/default.png",
      "is_verified": false,
      "has_hospital_class_a": false,
      "price_rent": 0,
      "price_buy": "//",
      "tags": ["resort"]
    }
  ]
}
```

Common errors:

- `500` failed to fetch cities

### `GET /api/cities/:id/houses`

Fetch latest house recommendations for a city.

Path params:

- `id`: city id

Response `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": 3,
      "city_id": 1,
      "title": "老破小但温馨，下楼就是早市，贼便宜",
      "cover_image": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      "price": 150,
      "district": "东山区",
      "community": "东山老村",
      "min_duration": "1个月起租",
      "tags": "集中供暖,精装修",
      "created_at": "2026-02-20T20:46:44.000Z"
    }
  ]
}
```

Common errors:

- `400` invalid city id
- `500` failed to fetch city houses

### `GET /api/user/profile`

Get current user profile (auth required).

Response `200`:

```json
{
  "ok": true,
  "data": {
    "id": 8,
    "phone": "13800000000",
    "username": "nomad0088",
    "avatar": "/static/logo.png",
    "tagline": "Start your nomad life today",
    "balance": "0.00",
    "created_at": "2026-02-20T18:58:00.000Z"
  }
}
```

Common errors:

- `401` token missing/invalid/expired
- `404` user profile not found
- `500` failed to fetch user profile

### `PUT /api/user/profile`

Update current user profile (auth required).

Request body:

```json
{
  "username": "new-name",
  "tagline": "API doc sync 2026-02-21",
  "avatar": "https://example.com/avatar.jpg"
}
```

Notes:

- `username` is required
- `tagline` is required
- `avatar` is optional

Response `200`:

```json
{
  "success": true,
  "message": "Profile updated"
}
```

Common errors:

- `400` username and tagline are required
- `401` token missing/invalid/expired
- `404` user not found
- `500` failed to update profile

### `POST /api/user/avatar`

Upload avatar (auth required).

Content type: `multipart/form-data`

Form fields:

- `avatar`: image file (required, max 5 MB)

Response `200`:

```json
{
  "success": true,
  "avatarUrl": "https://<bucket>.<endpoint>/avatars/<file>"
}
```

Common errors:

- `400` file missing, non-image file, or file too large
- `401` token missing/invalid/expired
- `500` OSS not configured or upload failed

## Regression Test Snapshot (2026-02-21)

Environment: existing service on `localhost:3000`, MySQL connected, OSS configured.

| Case | Method | URL | Status |
| --- | --- | --- | --- |
| health_ok | GET | `/api/health` | `200` |
| register_ok | POST | `/api/auth/register` | `201` |
| register_duplicate | POST | `/api/auth/register` | `409` |
| login_ok | POST | `/api/auth/login` | `200` |
| login_wrong_password | POST | `/api/auth/login` | `401` |
| cities_default | GET | `/api/cities` | `200` |
| cities_under500 | GET | `/api/cities?filter=under500` | `200` |
| cities_verified_maxRent | GET | `/api/cities?verified=true&maxRent=600` | `200` |
| city_houses_ok | GET | `/api/cities/1/houses` | `200` |
| profile_no_auth | GET | `/api/user/profile` | `401` |
| profile_bad_token | GET | `/api/user/profile` | `401` |
| profile_get_ok | GET | `/api/user/profile` | `200` |
| profile_put_missing | PUT | `/api/user/profile` | `400` |
| profile_put_ok | PUT | `/api/user/profile` | `200` |
| avatar_missing_file | POST | `/api/user/avatar` | `400` |
| avatar_upload_ok | POST | `/api/user/avatar` | `200` |

Observed data snapshot during this run:

- `GET /api/cities` total: `245`
- `GET /api/cities?filter=under500` total: `206`
- `GET /api/cities?verified=true&maxRent=600` total: `67`

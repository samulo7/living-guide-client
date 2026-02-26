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

### `GET /api/map/regeo`

Reverse geocode by Gaode (Amap) using server-side key.

Query params:

- `lat`: latitude, e.g. `45.7569`
- `lng`: longitude, e.g. `126.6425`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "formatted_address": "黑龙江省哈尔滨市道里区中央大街...",
    "province": "黑龙江省",
    "city": "哈尔滨市",
    "district": "道里区",
    "township": "",
    "adcode": "230102",
    "citycode": "0451"
  }
}
```

Common errors:

- `400` invalid lat/lng
- `503` missing `AMAP_WEB_KEY` on server
- `502` Gaode API failed or timeout
- `422` Gaode returned empty address for current coordinate

### `GET /api/map/inputtips`

Location keyword suggestions by Gaode (Amap), used by social publish page.

Query params:

- `keyword` (required): location keyword
- `city` (optional): city name/code
- `page_size` (optional): 1~20, default `10`

Response `200`:

```json
{
  "ok": true,
  "data": [
    {
      "title": "人民广场",
      "address": "黄浦区 人民大道",
      "adcode": "310101",
      "lat": 31.233734,
      "lng": 121.475024
    }
  ]
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

### `GET /api/jobs`

Fetch latest jobs with city relation.

Response `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "city_id": 1,
      "title": "网吧夜班网管",
      "salary": "¥180/天",
      "company": "鹤岗兴安电竞馆",
      "is_remote": 0,
      "tags": "包吃住、夜班补贴、可留宿",
      "description": "负责夜间值班与基础设备维护，工作节奏平稳，适合短住期间补贴生活费。",
      "created_at": "2026-02-22T00:00:00.000Z",
      "city_name": "鹤岗市"
    }
  ]
}
```

Common errors:

- `500` failed to fetch jobs

### `GET /api/companions`

Fetch latest companion posts.

Response `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "nickname": "北方热心饭搭子",
      "avatar": "",
      "city_name": "鹤岗",
      "title": "今晚找个饭搭子，AA 吃铁锅炖",
      "content": "我在兴安区，饭量正常，不劝酒不尬聊，吃完就散步回家。",
      "tags": "饭搭子,社恐友好,AA制",
      "created_at": "2026-02-22T00:00:00.000Z"
    }
  ]
}
```

Common errors:

- `500` failed to fetch companions

### `GET /api/user/profile`

Get user profile for MVP mode.

Notes:

- No login required in MVP.
- Server returns fixed `user_id = 1`.

Response `200`:

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "nickname": "鹤岗野生游民",
    "bio": "已在东北躺平 30 天，精神状态良好。",
    "avatar": ""
  }
}
```

Common errors:

- `404` user profile not found
- `500` failed to fetch user profile

### `GET /api/user/favorites`

Fetch favorite houses for MVP user (`user_id = 1`).

Response `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": 3,
      "city_id": 1,
      "city_name": "黑龙江鹤岗市/兴安区、东山区岭北小区",
      "title": "老破小但温馨，下楼就是早市，贼便宜",
      "cover_image": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      "price": 150,
      "district": "东山区",
      "tags": "生活便利,超低价",
      "created_at": "2026-02-20T20:46:44.000Z"
    }
  ]
}
```

Common errors:

- `500` failed to fetch favorite houses

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
| jobs_list_ok | GET | `/api/jobs` | `200` |
| companions_list_ok | GET | `/api/companions` | `200` |
| profile_get_ok | GET | `/api/user/profile` | `200` |
| favorites_get_ok | GET | `/api/user/favorites` | `200` |

Observed data snapshot during this run:

- `GET /api/cities` total: `245`
- `GET /api/cities?filter=under500` total: `206`
- `GET /api/cities?verified=true&maxRent=600` total: `67`

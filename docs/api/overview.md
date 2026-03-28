# API Overview

## Base URL

- `http://localhost:8848` (configurable via `PORT`)

## Health

### `GET /api/health`

Verifies the API is running.

Example response:

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Authentication

All auth routes are under `/api/auth`. Detailed sequences: `docs/auth-flow.md`.

### `POST /api/auth/signup`

Creates a user or agency admin account.

**Body (JSON)**

| Field         | Required       | Notes                                             |
| ------------- | -------------- | ------------------------------------------------- |
| `role`        | Yes            | `"user"` or `"agency_admin"`                      |
| `email`       | Yes            | Unique; stored lowercased                         |
| `password`    | Yes            | Minimum 8 characters                              |
| `phone`       | Yes            | Sign-up only                                      |
| `agencyName`  | Agency sign-up |                                                   |
| `serviceType` | Agency sign-up | `medical`, `fire`, `police`, `rescue`, `disaster` |
| `address`     | Agency sign-up |                                                   |

**Success `201`**

```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "...",
    "role": "user",
    "phone": "...",
    "agency": null
  }
}
```

Agency admins receive a populated `agency` object with `name`, `serviceType`, and `address`.

**Errors**

- `400` — validation (missing fields, bad email, weak password, invalid `serviceType`)
- `409` — email already registered
- `500` — server error

### `POST /api/auth/signin`

Signs in an existing account. The `role` in the body must match the account’s role (user vs agency admin).

**Body (JSON)**

| Field      | Required                           |
| ---------- | ---------------------------------- |
| `email`    | Yes                                |
| `password` | Yes                                |
| `role`     | Yes — `"user"` or `"agency_admin"` |

**Success `200`**

Same shape as sign-up: `token` and `user`.

**Errors**

- `400` — missing fields
- `401` — wrong email or password
- `403` — role mismatch (e.g. citizen account used on Agency Admin tab)
- `500` — server error

### `GET /api/auth/me`

Returns the current user. Requires header:

`Authorization: Bearer <jwt>`

**Success `200`**

```json
{
  "success": true,
  "user": { "id", "email", "role", "phone", "agency" }
}
```

**Errors**

- `401` — missing/invalid token
- `404` — user deleted
- `500` — server error

## Emergency contacts (citizen users only)

Requires `Authorization: Bearer <jwt>` for an account with `role: "user"`. Agency admins receive `403`.

### `GET /api/user/contacts`

Lists the signed-in user’s emergency contacts (newest first).

**Success `200`**

```json
{
  "success": true,
  "contacts": [
    {
      "id": "...",
      "name": "Marcus Johnson",
      "phone": "+1 (555) 123-4567",
      "relationship": "Husband",
      "notifyOnAlert": true,
      "createdAt": "2026-03-28T12:00:00.000Z",
      "updatedAt": "2026-03-28T12:00:00.000Z"
    }
  ]
}
```

### `POST /api/user/contacts`

Creates a contact.

**Body (JSON)**

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Non-empty string |
| `phone` | Yes | Non-empty string |
| `relationship` | Yes | Non-empty string |
| `notifyOnAlert` | No | Boolean; default `true` |

**Success `201`** — `{ "success": true, "contact": { ... } }`

### `PATCH /api/user/contacts/:id`

Updates a contact that belongs to the user. Send any subset of: `name`, `phone`, `relationship`, `notifyOnAlert`.

**Success `200`** — `{ "success": true, "contact": { ... } }`

**Errors** — `400` invalid id or empty field, `404` not found or not owned by user

### `DELETE /api/user/contacts/:id`

Removes a contact.

**Success `200`** — `{ "success": true, "message": "Contact removed" }`

## Planned areas

- Incidents, reports, emergency resources (broader than contacts)

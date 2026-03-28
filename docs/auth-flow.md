# Authentication flow (RapidAid)

This document describes how sign-up, sign-in, session recovery, and the plain HTML frontend connect to the Express API.

## Components

| Piece | Responsibility |
| --- | --- |
| `frontend/index.html`, `user-dashboard.html`, `js/login.js`, `js/user-dashboard.js` | Login/sign-up, user dashboard with emergency contacts backed by the API |
| `backend/src/models/User.js` | MongoDB user document: email, password hash, role, phone, optional agency profile |
| `backend/src/models/EmergencyContact.js` | Per-user emergency contacts |
| `backend/src/controllers/authController.js` | Validates input, hashes passwords, issues JWTs, enforces role-specific rules |
| `backend/src/controllers/contactsController.js` | CRUD for `/api/user/contacts` (citizen role only) |
| `backend/src/middleware/authMiddleware.js` | JWT verification; `requireRole` for route-level role checks |
| `backend/src/routes/authRoutes.js` | Mounts `/api/auth/*` |
| `backend/src/routes/userContactRoutes.js` | Mounts `/api/user/contacts` |

## Environment

Required variables (see `backend/.env.example`):

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing tokens (use a long random value in production)
- `JWT_EXPIRES_IN` — optional, default `7d` (passed to `jsonwebtoken`)

The server refuses to start if `JWT_SECRET` is missing.

## Roles

- **`user`** — citizen account (user dashboard).
- **`agency_admin`** — agency operator; sign-up additionally stores `agency.name`, `agency.serviceType`, `agency.address`.

The UI “User” / “Agency Admin” toggle maps directly to these roles. Sign-in checks that the account’s stored role matches the selected tab; otherwise the API returns `403` with a message explaining the mismatch.

## End-to-end sequences

### Sign up (citizen)

1. User selects **User** and **Sign Up**, enters phone, email, password (minimum 8 characters).
2. Browser `POST /api/auth/signup` with JSON body:
   - `role`: `"user"`
   - `email`, `password`, `phone`
3. Server validates email format, password length, unique email, hashes password with bcrypt, creates document, returns `201` with `token` and `user`.
4. Frontend stores `token` in `localStorage` (`rapidaid_token`) and `user` in `localStorage` (`rapidaid_user`), then shows the user dashboard.

### Sign up (agency admin)

1. User selects **Agency Admin** and **Sign Up**, fills agency name, phone, email, service type, address, password.
2. `POST /api/auth/signup` with `role`: `"agency_admin"` plus `agencyName`, `serviceType` (one of `medical`, `fire`, `police`, `rescue`, `disaster`), and `address`.
3. Same persistence and redirect as above, but UI shows the agency dashboard.

### Sign in

1. User selects the correct role tab (**User** or **Agency Admin**), **Login**, email and password.
2. `POST /api/auth/signin` with `email`, `password`, `role` (`"user"` or `"agency_admin"`).
3. Server finds user by email, compares password, ensures `user.role === role`, returns `token` and `user`.
4. Frontend stores session and opens the matching dashboard.

### Session restore (page refresh)

1. If `localStorage` contains `rapidaid_token`, frontend calls `GET /api/auth/me` with `Authorization: Bearer <token>`.
2. If valid, user JSON is refreshed in `localStorage` and the correct dashboard is shown.
3. If invalid or expired, tokens are cleared and the login view is shown.

### Emergency contacts (user dashboard)

1. After sign-in as a **user**, `user-dashboard.html` loads contacts with `GET /api/user/contacts` (Bearer JWT).
2. **Add** uses `POST /api/user/contacts` with `name`, `phone`, `relationship`, optional `notifyOnAlert`.
3. **Edit** uses `PATCH /api/user/contacts/:id` with the same fields (partial updates allowed on the server).
4. The **notify on alert** switch calls `PATCH` with `{ notifyOnAlert: true|false }`.
5. **`agency_admin`** tokens receive `403` on all `/api/user/contacts` routes.

### Sign out

1. Logout clears `localStorage` token and user profile, then returns to `index.html`.

## CORS and local development

The API enables CORS for browser `fetch` (including `Authorization`). Serve the frontend over HTTP (for example `python3 -m http.server` inside `frontend/`) so origins are consistent; `file://` can be problematic for API calls.

## Security notes (production checklist)

- Use a strong `JWT_SECRET` and rotate keys with a planned migration if compromised.
- Serve the API over HTTPS; set `Secure`, `HttpOnly`, `SameSite` cookies if you move from localStorage to cookies.
- Add rate limiting and account lockout policies for `/auth/signin` and `/auth/signup` before public launch.
- “Forgot password” is not implemented; the UI shows a placeholder message until a reset flow exists.

## Related files

- API surface: `docs/api/overview.md`
- User schema fields: `backend/src/models/User.js`

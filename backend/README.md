# Backend (Node.js + MongoDB)

Minimal backend scaffold using Express and Mongoose.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file:

```bash
cp .env.example .env
```

3. Start local MongoDB and run backend:

```bash
npm run dev
```

## Scripts

- `npm run dev`: Run backend with auto-reload via nodemon.
- `npm start`: Run backend with Node.js.

## API

- `GET /api/health` — liveness check
- `POST /api/auth/signup` — register (`user` or `agency_admin`)
- `POST /api/auth/signin` — login (role must match account)
- `GET /api/auth/me` — current user (Bearer JWT)
- `GET|POST /api/user/contacts` — list / create emergency contacts (**`user` role only**)
- `PATCH|DELETE /api/user/contacts/:id` — update / delete own contact

Requires `JWT_SECRET` in `.env`. See `docs/auth-flow.md` and `docs/api/overview.md`.

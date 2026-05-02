# Backend Setup Guide (Absolute Beginner Step-by-Step)

This guide helps you run the backend from zero.

## 1) Open terminal and go to project

```bash
cd /Users/rjach/Stuffs/emergency-services-app
```

## 2) Enter backend folder

```bash
cd backend
```

## 3) Install backend dependencies

```bash
npm install
```

What this does:

- Downloads packages listed in `package.json`
- Creates/uses `node_modules`

## 4) Create environment file

Copy example file:

```bash
cp .env.example .env
```

Now open `.env` and verify values:

```env
PORT=8848
MONGODB_URI=mongodb://127.0.0.1:27017/emergency_services_app
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d
```

`JWT_SECRET` is required: the server exits on startup if it is missing. Use a long random string in production (for example `openssl rand -hex 32`).

## 5) Start MongoDB

Make sure MongoDB service is running.

If installed with Homebrew service:

```bash
brew services start mongodb-community
```

## 6) Run backend server

```bash
npm run dev
```

Expected logs:

- `MongoDB connected successfully`
- `Backend server running on https://api.rapidaid.rojanacharya.com`

## 7) Test backend API in browser

Open:

- <https://api.rapidaid.rojanacharya.com/api/health>

Expected JSON response with `success: true`.

## 8) Test backend API in Postman (optional)

1. Open Postman
2. Method: `GET`
3. URL: `https://api.rapidaid.rojanacharya.com/api/health`
4. Click **Send**
5. Verify JSON response

## 9) Stop backend server

In the terminal where backend is running, press:

- `Control + C`

## Troubleshooting

### Error: `Missing MONGODB_URI`

- `.env` file is missing or not configured
- Recreate using `cp .env.example .env`

### Error: Mongo connection refused

- MongoDB service is not running
- Start MongoDB and rerun backend

### Port already in use

- Another app uses port `8848`
- Change `PORT` in `.env` to `5001`, then restart

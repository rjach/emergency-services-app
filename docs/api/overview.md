# API Overview

This is a scaffold API.

## Base URL

- `http://localhost:5000`

## Available Endpoint

### Health Check

- Method: `GET`
- Path: `/api/health`
- Purpose: verify backend is running

Example response:

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Next Endpoint Categories (To Be Built by Team)

- Authentication
- Users
- Incidents
- Reports
- Emergency resources

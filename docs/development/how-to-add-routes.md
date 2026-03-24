# How to Create Backend Routes

## Folder Responsibilities

- `src/routes/`: route definitions
- `src/controllers/`: request handlers
- `src/models/`: database schemas

## Step-by-Step: Create a New Route

### 1) Create controller function

Create file in `src/controllers/`, for example `incidentController.js`.

### 2) Create route definitions

Create file in `src/routes/`, for example `incidentRoutes.js` and map HTTP methods.

### 3) Mount route in central router

Import and use the route file inside `src/routes/index.js`.

## Example Route Pattern

- `GET /api/incidents`
- `POST /api/incidents`
- `GET /api/incidents/:id`
- `PUT /api/incidents/:id`
- `DELETE /api/incidents/:id`

## Testing Route

Use Postman or frontend `fetch`:

```js
fetch('http://localhost:5000/api/incidents')
  .then((response) => response.json())
  .then((data) => console.log(data));
```

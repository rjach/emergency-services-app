# How to Test Backend APIs from Frontend

This guide explains API testing in simple steps.

## 1) Confirm backend is running

Backend URL:

- `https://api.rapidaid.rojanacharya.com`

Health endpoint:

- `https://api.rapidaid.rojanacharya.com/api/health`

## 2) Understand request parts

Every frontend API call needs:

- URL
- HTTP method (`GET`, `POST`, `PUT`, `DELETE`)
- Optional headers
- Optional body (for `POST`/`PUT`)

## 3) Basic GET example

```js
const response = await fetch(
  "https://api.rapidaid.rojanacharya.com/api/health",
);
const data = await response.json();
console.log(data);
```

## 4) Basic POST example

```js
const response = await fetch(
  "https://api.rapidaid.rojanacharya.com/api/example",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "test value" }),
  },
);

const data = await response.json();
console.log(data);
```

## 5) How to check response status

```js
if (!response.ok) {
  throw new Error(`Request failed with status ${response.status}`);
}
```

## 6) Debug using browser tools

1. Right click -> Inspect
2. Open **Network** tab
3. Trigger request
4. Click request and inspect:
   - URL
   - Method
   - Status code
   - Response body

## 7) CORS note (important)

If frontend and backend are on different ports, browser may block requests unless backend enables CORS.

This scaffold does not include CORS package intentionally. Add it when your team starts full integration.

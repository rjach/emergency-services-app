require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDatabase = require("./config/database");
const apiRoutes = require("./routes");

const app = express();
// Parse env origins into array
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, webhooks)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Hub-Signature",
      "X-Hub-Signature-256",
      "X-Event-Id",
    ],
    credentials: true,
  }),
);

app.use(express.json());

/** Serverless entrypoints often load `app` without running `server.js`; connect before DB-backed routes. */
async function ensureDatabase(req, res, next) {
  if (req.path === "/health") {
    return next();
  }
  try {
    await connectDatabase();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    next(err);
  }
}

app.use("/api", ensureDatabase);
app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.name === "MongoServerSelectionError" ? 503 : 500;
  res.status(status).json({
    success: false,
    message:
      status === 503
        ? "Database temporarily unavailable"
        : "An unexpected error occurred",
  });
});

module.exports = app;

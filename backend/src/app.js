const express = require("express");
const cors = require("cors");
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
    optionsSuccessStatus: 204,
  }),
);

// Preflight handler
app.options("*", cors());

app.use(express.json());
app.use("/api", apiRoutes);

module.exports = app;

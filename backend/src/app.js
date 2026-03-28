const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // allow ALL origins (including no-origin like curl/postman)
      callback(null, true);
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
app.use("/api", apiRoutes);

module.exports = app;

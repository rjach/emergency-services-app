const mongoose = require("mongoose");
require("dotenv").config();

const GLOBAL_CACHE_KEY = "_emergencyServicesMongoosePromise";

function getPromiseCache() {
  const g = global;
  if (!g[GLOBAL_CACHE_KEY]) {
    g[GLOBAL_CACHE_KEY] = { promise: null };
  }
  return g[GLOBAL_CACHE_KEY];
}

/**
 * Connects to MongoDB once per warm serverless instance; reuses the same
 * promise for concurrent cold-start requests. Local `server.js` also awaits this
 * before listen().
 */
async function connectDatabase() {
  const databaseUri = process.env.MONGODB_URI;

  if (!databaseUri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  const cached = getPromiseCache();

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(databaseUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  await cached.promise;
  console.log("MongoDB connected successfully");
}

module.exports = connectDatabase;

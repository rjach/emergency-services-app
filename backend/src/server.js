require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/database");

const DEFAULT_PORT = 8848;
const port = Number(process.env.PORT) || DEFAULT_PORT;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in environment variables");
    }
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    process.exit(1);
  }
}

startServer();

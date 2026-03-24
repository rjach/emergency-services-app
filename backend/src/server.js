const app = require('./app');
const connectDatabase = require('./config/database');

const DEFAULT_PORT = 5000;
const port = Number(process.env.PORT) || DEFAULT_PORT;

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error.message);
    process.exit(1);
  }
}

startServer();

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function connectDatabase() {
  const databaseUri = process.env.MONGODB_URI;

  if (!databaseUri) {
    throw new Error('Missing MONGODB_URI in environment variables');
  }

  await mongoose.connect(databaseUri);
  console.log('MongoDB connected successfully');
}

module.exports = connectDatabase;

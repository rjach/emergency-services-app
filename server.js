const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Serve static files from parent directory (root)
app.use(express.static(path.join(__dirname, '..')));

// Google Maps config endpoint
app.get('/api/maps-config', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'your_actual_api_key_here') {
    return res.status(500).json({ 
      error: 'Google Maps API key not configured',
      apiKey: null 
    });
  }
  
  res.json({ apiKey });
});

// Serve the dashboard HTML for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'user-dashboard.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
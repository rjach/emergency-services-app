require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(express.static(path.join(__dirname)));
app.use(express.json());

app.get('/api/config', (req, res) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }
  res.json({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
});

const mockMessages = {
  SYSTEM: [
    'Vitals update: Heart rate 108 bpm, SpO2 96%.',
    'GPS signal strong. Tracking active.',
    'Backup unit alerted in sector 7.',
    'Wearable connection stable. Monitoring continuously.',
    'Incident priority confirmed: HIGH.',
    'Nearest hospital: St. Mary\'s Medical Center, 2.3 km.',
    'Weather conditions: Clear skies, 72°F.',
    'Battery level on wearable device: 64%.'
  ],
  'AMB-104': [
    'Turning onto Main St. ETA 1 min.',
    'Arrived at scene. Deploying equipment.',
    'Patient contact established.',
    'Navigating through intersection. Sirens active.',
    'Cleared traffic on Oak Ave. Proceeding south.',
    'Requesting additional medical supplies from dispatch.',
    'Speed: 35 mph. On track for ETA.'
  ],
  'MEDIC-02': [
    'En route via Highway 101. Clear traffic.',
    'Medical kit prepped. Ready for arrival.',
    'Coordinating with AMB-104 on channel 5.',
    'Switched to alternate route via Pine St.',
    'Defibrillator charged and ready.',
    'ETA updated: 3 minutes.',
    'Confirming patient details with dispatch.'
  ],
  DISPATCH: [
    'Additional patrol unit requested.',
    'Hospital notified. ER bay 3 reserved.',
    'Traffic control requested at intersection.',
    'Backup ambulance on standby in sector 4.',
    'Fire department notified as precaution.',
    'Police escort arranged for critical route.',
    'All units: maintain radio discipline on channel 5.'
  ]
};

const categories = Object.keys(mockMessages);

let updateIdCounter = 1;
const updatesStore = [];

function generateRandomUpdate() {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const messages = mockMessages[category];
  const message = messages[Math.floor(Math.random() * messages.length)];
  return {
    id: 'upd-' + (updateIdCounter++),
    category: category,
    message: message,
    timestamp: new Date().toISOString()
  };
}

app.get('/api/updates', (req, res) => {
  const newUpdate = generateRandomUpdate();
  updatesStore.push(newUpdate);
  const latest = updatesStore.slice(-20);
  res.json(latest);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const interval = setInterval(() => {
    const update = generateRandomUpdate();
    updatesStore.push(update);
    socket.emit('new-update', update);
  }, 15000);

  socket.on('reporter-message', (msg) => {
    const update = {
      id: 'upd-' + (updateIdCounter++),
      category: 'REPORTER',
      message: msg,
      timestamp: new Date().toISOString()
    };
    updatesStore.push(update);
    io.emit('new-update', update);
  });

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`\n  RapidAid server running at http://localhost:${PORT}\n`);
});

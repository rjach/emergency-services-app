'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT, 10) || 3001;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[RapidAid] FATAL: JWT_SECRET env var is required. Exiting.');
  process.exit(1);
}

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_USER || !ADMIN_PASS) {
  console.error('[RapidAid] FATAL: ADMIN_USER and ADMIN_PASS env vars are required. Exiting.');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rapidaid';

async function initDb() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('[DB] MongoDB connected →', MONGO_URI);
}

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected — Mongoose will auto-reconnect');
});

const incidentSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, unique: true, maxlength: 64 },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    acc: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'resolved', 'cancelled'], default: 'active' },
    history: {
      type: [
        {
          lat: Number,
          lng: Number,
          acc: Number,
          recorded: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

incidentSchema.index({ case_id: 1 });
incidentSchema.index({ status: 1 });

const Incident = mongoose.model('Incident', incidentSchema);

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:3001'
)
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error('CORS: origin not allowed — ' + origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

app.options('*', cors());

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(express.json({ limit: '64kb' }));

app.use(express.static(path.join(__dirname, 'public')));

const _rateBuckets = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = _rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW };
    _rateBuckets.set(ip, bucket);
  }

  bucket.count++;
  if (bucket.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests — slow down' });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of _rateBuckets) {
    if (now > b.resetAt) _rateBuckets.delete(ip);
  }
}, 300_000);

function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' &&
    isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function sanitizeString(str, maxLen = 64) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"']/g, '').trim().slice(0, maxLen);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorised — no token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    console.warn('[Auth] JWT rejected:', e.message);
    res.status(401).json({ error: 'Unauthorised — invalid or expired token' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign(
      { sub: sanitizeString(username), role: 'responder' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ token });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/location', rateLimit, async (req, res) => {
  try {
    const { case_id, lat, lng, acc } = req.body || {};

    const safeId = sanitizeString(case_id);
    if (!safeId) return res.status(400).json({ error: 'case_id is required' });

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numAcc = parseFloat(acc) || 0;

    if (!isValidCoord(numLat, numLng)) {
      return res.status(400).json({ error: 'Invalid lat/lng coordinates' });
    }

    const doc = await Incident.findOneAndUpdate(
      { case_id: safeId },
      {
        $set: {
          lat: numLat,
          lng: numLng,
          acc: numAcc,
          status: 'active',
        },
        $push: {
          history: {
            $each: [
              { lat: numLat, lng: numLng, acc: numAcc, recorded: new Date() },
            ],
            $slice: -500,
          },
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const payload = {
      _id: doc._id,
      case_id: doc.case_id,
      lat: doc.lat,
      lng: doc.lng,
      acc: doc.acc,
      updatedAt: doc.updatedAt,
    };

    io.to('incident:' + safeId).emit('location-update', payload);
    res.json(payload);
  } catch (err) {
    console.error('[POST /api/location]', err.message);
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
});

app.get('/api/incidents/:id', authMiddleware, async (req, res) => {
  try {
    const caseId = sanitizeString(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'Invalid case id' });

    const doc = await Incident.findOne(
      { case_id: caseId },
      { __v: 0, history: { $slice: -100 } }
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Incident not found' });
    res.json(doc);
  } catch (err) {
    console.error('[GET /api/incidents/:id]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/incidents/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const caseId = sanitizeString(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'Invalid case id' });

    const doc = await Incident.findOneAndUpdate(
      { case_id: caseId },
      { $set: { status: 'resolved' } },
      { new: true, projection: { case_id: 1, status: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Incident not found' });

    io.to('incident:' + caseId).emit('incident-resolved', {
      case_id: caseId,
      status: 'resolved',
    });

    res.json({ ok: true, case_id: doc.case_id, status: doc.status });
  } catch (err) {
    console.error('[POST /api/incidents/:id/resolve]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;

  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    uptime: process.uptime(),
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, _next) => {
  console.error('[Express error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);

  socket.on('join-incident', (data) => {
    try {
      const caseId = sanitizeString(data && data.caseId ? data.caseId : '');
      if (!caseId) return;

      const room = 'incident:' + caseId;
      socket.join(room);

      console.log('[Socket]', socket.id, '→ room', room);
      socket.emit('joined', { room });
    } catch (e) {
      console.error('[Socket] join-incident error:', e.message);
    }
  });

  socket.on('location-update', (data) => {
    try {
      const caseId = sanitizeString(data && data.case_id ? data.case_id : '');
      if (!caseId) return;

      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lng);
      const acc = parseFloat(data.acc) || 0;

      if (!isValidCoord(lat, lng)) {
        console.warn('[Socket] location-update: invalid coords from', socket.id);
        return;
      }

      socket.to('incident:' + caseId).emit('location-update', {
        case_id: caseId,
        lat,
        lng,
        acc,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[Socket] location-update error:', e.message);
    }
  });

  socket.on('operator-update', (data) => {
    try {
      const caseId = sanitizeString(data && data.case_id ? data.case_id : '');
      if (!caseId) return;

      socket.to('incident:' + caseId).emit('operator-update', {
        case_id: caseId,
        message: sanitizeString(data.message || '', 280),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[Socket] operator-update error:', e.message);
    }
  });

  socket.on('incident-resolved', (data) => {
    try {
      const caseId = sanitizeString(data && data.case_id ? data.case_id : '');
      if (!caseId) return;

      io.to('incident:' + caseId).emit('incident-resolved', {
        case_id: caseId,
      });
    } catch (e) {
      console.error('[Socket] incident-resolved error:', e.message);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', socket.id, '·', reason);
  });
});

(async () => {
  try {
    await initDb();
    server.listen(PORT, () => {
      console.log('[RapidAid] Server →  http://localhost:' + PORT);
      console.log('[RapidAid] Frontend → http://localhost:' + PORT + '/index.html');
      console.log('[RapidAid] HTTPS required in production for geolocation API');
      console.log('[RapidAid] MongoDB  →', MONGO_URI);
    });
  } catch (err) {
    console.error('[RapidAid] Startup failed:', err.message);
    process.exit(1);
  }
})();
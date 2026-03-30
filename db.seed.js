'use strict';
require('dotenv').config();

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rapidaid';

const incidentSchema = new mongoose.Schema(
  {
    case_id: { type: String, required: true, unique: true, maxlength: 64 },
    lat:     { type: Number, required: true, min: -90,  max: 90  },
    lng:     { type: Number, required: true, min: -180, max: 180 },
    acc:     { type: Number, default: 0, min: 0 },   // FIX: min: 0 added
    status:  { type: String, enum: ['active', 'resolved', 'cancelled'], default: 'active' },
    history: {
      type: [{ lat: Number, lng: Number, acc: Number, recorded: { type: Date, default: Date.now } }],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

const Incident = mongoose.model('Incident', incidentSchema);

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seed] Connected to MongoDB →', MONGO_URI);

    const doc = await Incident.findOneAndUpdate(
      { case_id: 'RA-00279' },
      {
        $setOnInsert: {
          case_id: 'RA-00279',
          lat:     27.71720,
          lng:     85.32400,
          acc:     15.0,
          status:  'active',
          history: [{ lat: 27.71720, lng: 85.32400, acc: 15.0 }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[Seed] Incident upserted:', {
      _id:     doc._id.toString(),
      case_id: doc.case_id,
      lat:     doc.lat,
      lng:     doc.lng,
      status:  doc.status,
    });

    console.log('[Seed] Done — collection: incidents  database: rapidaid');
  } catch (err) {
    console.error('[Seed] Failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();

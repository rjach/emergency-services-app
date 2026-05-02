const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const recentActivitySchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ['incident_report'],
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    serviceType: { type: String, trim: true, required: true },
    summary: { type: String, trim: true, default: '' },
    statusLabel: { type: String, trim: true, default: 'SUBMITTED' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'agency_admin'],
      required: true,
    },
    phone: { type: String, trim: true, default: '' },
    agency: agencySchema,
    recentActivities: {
      type: [recentActivitySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

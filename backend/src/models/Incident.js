const mongoose = require('mongoose');

const SERVICE_TYPES = ['ambulance', 'fire', 'police'];
const STATUSES = ['pending', 'responding', 'resolved'];

const incidentSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: true,
      enum: SERVICE_TYPES,
    },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracyM: { type: Number, default: null },
      addressLabel: { type: String, trim: true, default: '' },
    },
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reporterEmail: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
module.exports.SERVICE_TYPES = SERVICE_TYPES;
module.exports.STATUSES = STATUSES;

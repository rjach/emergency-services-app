const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    notifyOnAlert: { type: Boolean, default: true },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);

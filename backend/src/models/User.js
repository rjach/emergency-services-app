const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    address: { type: String, trim: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

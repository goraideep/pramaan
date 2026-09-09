// A user of the PRAMAAN system.
// role decides what they're allowed to do (checked in middleware/auth.js).
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
    role: {
      type: String,
      enum: ['officer', 'reviewer', 'admin'],
      default: 'officer',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

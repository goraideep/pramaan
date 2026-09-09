// Append-only trail of everything that happens in the system.
// Nothing in the app ever updates or deletes an AuditLog entry - only inserts.
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    action: { type: String, required: true }, // e.g. "DOCUMENT_UPLOADED"
    tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Bidder' },
    details: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);

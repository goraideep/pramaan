// An uploaded document belonging to a bidder, plus whatever the AI service
// extracted from it. Kept as its own collection because a bidder can have many.
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Bidder', required: true },
    category: { type: String, required: true }, // e.g. "GST Certificate"
    originalName: String,
    filePath: String, // where it's stored on disk (or a placeholder for seeded demo docs)
    mimeType: String,

    processingStatus: {
      type: String,
      enum: ['UPLOADED', 'PROCESSED', 'FAILED'],
      default: 'UPLOADED',
    },

    extracted: {
      legalName: String,
      pan: String,
      gstin: String,
      udyam: String,
      registrationNumber: String,
      issueDate: String,
      expiryDate: String,
      turnover: Number,
      confidence: Number, // 0-100, how sure the (simulated) AI extraction is
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);

// A tender (a procurement notice) with a list of requirements a bidder must meet.
// Requirements are stored as an embedded array because they always belong to
// exactly one tender and are small - no need for a separate collection.
const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // e.g. "gst", "pan", "turnover"
    label: { type: String, required: true }, // e.g. "GST Registration"
    category: { type: String, default: 'General' },
    mandatory: { type: Boolean, default: true },
    weight: { type: Number, default: 10 }, // used by the compliance score
    threshold: { type: String, default: '' }, // e.g. "10000000" for turnover in INR
  },
  { _id: false }
);

const tenderSchema = new mongoose.Schema(
  {
    tenderId: { type: String, required: true, unique: true }, // e.g. CPCL/PROC/2026/001
    title: { type: String, required: true },
    organization: { type: String, default: 'Chennai Petroleum Corporation Limited' },
    department: { type: String, default: 'Ministry of Petroleum & Natural Gas' },
    category: { type: String, default: 'General' },
    estimatedValue: { type: Number, default: 0 },
    submissionDeadline: { type: Date },
    description: { type: String, default: '' },
    requirements: [requirementSchema],
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tender', tenderSchema);

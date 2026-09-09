// A bidder participating in a tender.
//
// Design choice for a hackathon-sized project: instead of spreading data across
// many collections (ComplianceCheck, RiskAssessment, Discrepancy, Recommendation...)
// we embed the *results* of verification directly on the Bidder document.
// This keeps the data model small enough to explain on a whiteboard, while the
// *logic* that produces these results still lives in separate service files
// (services/complianceService.js, services/riskService.js) so the code stays clean.
const mongoose = require('mongoose');

const discrepancySchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ['low', 'medium', 'critical'], required: true },
    field: { type: String, required: true }, // e.g. "Legal Name"
    documentA: String,
    valueA: String,
    documentB: String,
    valueB: String,
    explanation: String,
  },
  { _id: false }
);

const complianceItemSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    category: String,
    result: { type: String, enum: ['PASS', 'FAIL', 'WARNING', 'PENDING', 'NOT_APPLICABLE'] },
    expected: String,
    extracted: String,
    sourceDocument: String,
    confidence: Number,
  },
  { _id: false }
);

const riskFactorSchema = new mongoose.Schema(
  {
    label: String,
    points: Number,
    reason: String,
  },
  { _id: false }
);

const decisionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['QUALIFIED', 'DISQUALIFIED', 'CONDITIONALLY_QUALIFIED', 'NEEDS_CLARIFICATION'],
    },
    reason: String,
    remarks: String,
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { _id: false }
);

const bidderSchema = new mongoose.Schema(
  {
    tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    name: { type: String, required: true },
    gstin: String,
    pan: String,
    udyam: String,

    verificationStatus: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED',
    },

    complianceScore: { type: Number, default: 0 }, // 0-100, weighted
    riskScore: { type: Number, default: 0 }, // 0-100, higher = riskier
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'],
      default: 'UNKNOWN',
    },

    complianceItems: [complianceItemSchema],
    riskFactors: [riskFactorSchema],
    discrepancies: [discrepancySchema],

    aiRecommendation: { type: String, default: '' },
    aiMode: { type: String, enum: ['demo', 'gemini'], default: 'demo' },

    decision: decisionSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bidder', bidderSchema);

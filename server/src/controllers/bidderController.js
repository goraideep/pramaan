const Tender = require('../models/Tender');
const Bidder = require('../models/Bidder');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { runComplianceEngine } = require('../services/complianceService');
const { calculateRisk } = require('../services/riskService');
const { buildRecommendation } = require('../services/recommendationService');
const { logAction } = require('../utils/audit');

// POST /api/tenders/:tenderId/bidders
async function createBidder(req, res) {
  const tender = await Tender.findById(req.params.tenderId);
  if (!tender) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tender not found' } });
  }

  const { name, gstin, pan, udyam } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Bidder name is required' } });
  }

  const bidder = await Bidder.create({ tender: tender._id, name, gstin, pan, udyam });
  await logAction({ user: req.user, action: 'BIDDER_ADDED', tender: tender._id, bidder: bidder._id, details: `Bidder ${name} added` });

  res.status(201).json({ success: true, data: bidder });
}

// GET /api/tenders/:tenderId/bidders
async function listBiddersForTender(req, res) {
  const bidders = await Bidder.find({ tender: req.params.tenderId }).sort({ createdAt: -1 });
  res.json({ success: true, data: bidders });
}

// GET /api/bidders/:id
async function getBidder(req, res) {
  const bidder = await Bidder.findById(req.params.id).populate('tender');
  if (!bidder) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bidder not found' } });
  }
  const documents = await Document.find({ bidder: bidder._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { bidder, documents } });
}

// POST /api/bidders/:id/verify
// Orchestrates: compliance engine -> risk engine -> recommendation text.
// This is the endpoint that runs every time "Run Verification" is clicked.
async function runVerification(req, res) {
  const bidder = await Bidder.findById(req.params.id).populate('tender');
  if (!bidder) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bidder not found' } });
  }

  const documents = await Document.find({ bidder: bidder._id });

  const { complianceItems, complianceScore, discrepancies } = runComplianceEngine(bidder.tender, bidder, documents);
  const { riskScore, riskLevel, riskFactors } = calculateRisk(complianceItems, discrepancies);
  const aiRecommendation = buildRecommendation({ complianceItems, complianceScore, riskLevel, discrepancies });

  bidder.complianceItems = complianceItems;
  bidder.complianceScore = complianceScore;
  bidder.discrepancies = discrepancies;
  bidder.riskScore = riskScore;
  bidder.riskLevel = riskLevel;
  bidder.riskFactors = riskFactors;
  bidder.aiRecommendation = aiRecommendation;
  bidder.verificationStatus = 'COMPLETED';
  await bidder.save();

  await logAction({
    user: req.user,
    action: 'VERIFICATION_COMPLETED',
    tender: bidder.tender._id,
    bidder: bidder._id,
    details: `Score ${complianceScore}/100, Risk ${riskLevel} (${riskScore})`,
  });

  res.json({ success: true, data: bidder });
}

// POST /api/bidders/:id/decision  (officer only, enforced in routes)
async function submitDecision(req, res) {
  const { status, reason, remarks } = req.body;
  const allowed = ['QUALIFIED', 'DISQUALIFIED', 'CONDITIONALLY_QUALIFIED', 'NEEDS_CLARIFICATION'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `status must be one of ${allowed.join(', ')}` } });
  }
  if (!reason) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'A decision reason is required' } });
  }

  const bidder = await Bidder.findById(req.params.id);
  if (!bidder) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bidder not found' } });
  }

  bidder.decision = { status, reason, remarks, decidedBy: req.user._id, decidedAt: new Date() };
  await bidder.save();

  await logAction({
    user: req.user,
    action: 'DECISION_RECORDED',
    tender: bidder.tender,
    bidder: bidder._id,
    details: `${status} - ${reason}`,
  });

  res.json({ success: true, data: bidder });
}

// GET /api/bidders/:id/audit
async function getBidderAudit(req, res) {
  const logs = await AuditLog.find({ bidder: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: logs });
}

// GET /api/audit  (global trail)
async function getAllAudit(req, res) {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: logs });
}

// GET /api/dashboard/stats
async function getDashboardStats(req, res) {
  const [activeTenders, totalBidders, documentsProcessed, bidders] = await Promise.all([
    Tender.countDocuments({ status: 'active' }),
    Bidder.countDocuments(),
    Document.countDocuments({ processingStatus: 'PROCESSED' }),
    Bidder.find(),
  ]);

  const compliant = bidders.filter((b) => b.complianceScore >= 75).length;
  const highRisk = bidders.filter((b) => b.riskLevel === 'HIGH' || b.riskLevel === 'CRITICAL').length;
  const pendingVerification = bidders.filter((b) => b.verificationStatus !== 'COMPLETED').length;
  const criticalDiscrepancies = bidders.reduce(
    (sum, b) => sum + b.discrepancies.filter((d) => d.severity === 'critical').length,
    0
  );

  res.json({
    success: true,
    data: {
      activeTenders,
      totalBidders,
      documentsProcessed,
      pendingVerification,
      compliantBidders: compliant,
      highRiskBidders: highRisk,
      criticalDiscrepancies,
      riskDistribution: {
        LOW: bidders.filter((b) => b.riskLevel === 'LOW').length,
        MEDIUM: bidders.filter((b) => b.riskLevel === 'MEDIUM').length,
        HIGH: bidders.filter((b) => b.riskLevel === 'HIGH').length,
        CRITICAL: bidders.filter((b) => b.riskLevel === 'CRITICAL').length,
      },
    },
  });
}

module.exports = {
  createBidder,
  listBiddersForTender,
  getBidder,
  runVerification,
  submitDecision,
  getBidderAudit,
  getAllAudit,
  getDashboardStats,
};

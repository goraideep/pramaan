const Tender = require('../models/Tender');
const Bidder = require('../models/Bidder');
const { logAction } = require('../utils/audit');

// GET /api/tenders
async function listTenders(req, res) {
  const tenders = await Tender.find().sort({ createdAt: -1 });
  res.json({ success: true, data: tenders });
}

// POST /api/tenders
async function createTender(req, res) {
  const { tenderId, title, organization, department, category, estimatedValue, submissionDeadline, description, requirements } = req.body;

  if (!tenderId || !title) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'tenderId and title are required' } });
  }

  const tender = await Tender.create({
    tenderId,
    title,
    organization,
    department,
    category,
    estimatedValue,
    submissionDeadline,
    description,
    requirements: requirements || [],
    createdBy: req.user._id,
  });

  await logAction({ user: req.user, action: 'TENDER_CREATED', tender: tender._id, details: `Tender ${tender.tenderId} created` });

  res.status(201).json({ success: true, data: tender });
}

// GET /api/tenders/:id
async function getTender(req, res) {
  const tender = await Tender.findById(req.params.id);
  if (!tender) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tender not found' } });
  }
  const bidderCount = await Bidder.countDocuments({ tender: tender._id });
  res.json({ success: true, data: { ...tender.toObject(), bidderCount } });
}

// PUT /api/tenders/:id
async function updateTender(req, res) {
  const tender = await Tender.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!tender) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tender not found' } });
  }
  await logAction({ user: req.user, action: 'TENDER_UPDATED', tender: tender._id, details: `Tender ${tender.tenderId} updated` });
  res.json({ success: true, data: tender });
}

module.exports = { listTenders, createTender, getTender, updateTender };

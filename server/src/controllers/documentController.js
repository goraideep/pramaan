const Document = require('../models/Document');
const Bidder = require('../models/Bidder');
const { extractFields } = require('../services/aiService');
const { logAction } = require('../utils/audit');

// POST /api/bidders/:id/documents  (multipart/form-data, field name "file")
async function uploadDocument(req, res) {
  const bidder = await Bidder.findById(req.params.id);
  if (!bidder) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bidder not found' } });
  }

  const { category } = req.body;
  if (!category) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Document category is required' } });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No file uploaded' } });
  }

  const document = await Document.create({
    bidder: bidder._id,
    category,
    originalName: req.file.originalname,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    processingStatus: 'UPLOADED',
  });

  await logAction({ user: req.user, action: 'DOCUMENT_UPLOADED', tender: bidder.tender, bidder: bidder._id, details: `${category} (${req.file.originalname})` });

  // Run the (demo/real) AI extraction step right after upload, the same way
  // the pipeline described in the README works: UPLOAD -> OCR -> EXTRACTION.
  const { extracted, mode } = await extractFields(category, req.file.originalname, bidder.name);
  document.extracted = extracted;
  document.processingStatus = 'PROCESSED';
  await document.save();

  bidder.aiMode = mode;
  bidder.verificationStatus = 'IN_PROGRESS';
  await bidder.save();

  await logAction({ user: req.user, action: 'AI_EXTRACTION_COMPLETED', tender: bidder.tender, bidder: bidder._id, details: `${category} processed (${mode} mode)` });

  res.status(201).json({ success: true, data: document });
}

// GET /api/bidders/:id/documents
async function listDocuments(req, res) {
  const documents = await Document.find({ bidder: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: documents });
}

module.exports = { uploadDocument, listDocuments };

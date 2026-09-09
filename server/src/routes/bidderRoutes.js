const express = require('express');
const {
  getBidder,
  runVerification,
  submitDecision,
  getBidderAudit,
} = require('../controllers/bidderController');
const { uploadDocument, listDocuments } = require('../controllers/documentController');
const { protect, allowRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/:id', getBidder);
router.post('/:id/verify', allowRoles('officer', 'reviewer', 'admin'), runVerification);
router.post('/:id/decision', allowRoles('officer'), submitDecision);
router.get('/:id/audit', getBidderAudit);

router.post('/:id/documents', allowRoles('officer', 'admin'), upload.single('file'), uploadDocument);
router.get('/:id/documents', listDocuments);

module.exports = router;

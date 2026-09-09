const express = require('express');
const { getAllAudit } = require('../controllers/bidderController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.get('/', protect, getAllAudit);
module.exports = router;

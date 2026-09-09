const express = require('express');
const { listTenders, createTender, getTender, updateTender } = require('../controllers/tenderController');
const { createBidder, listBiddersForTender } = require('../controllers/bidderController');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listTenders);
router.post('/', allowRoles('officer', 'admin'), createTender);
router.get('/:id', getTender);
router.put('/:id', allowRoles('officer', 'admin'), updateTender);

router.get('/:tenderId/bidders', listBiddersForTender);
router.post('/:tenderId/bidders', allowRoles('officer', 'admin'), createBidder);

module.exports = router;

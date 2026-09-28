const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/reportController');
const { REPORT_CATEGORIES } = require('../config/reportRegistry');

const router = express.Router();

router.get('/categories', (_req, res) => {
  res.json({ success: true, data: { categories: REPORT_CATEGORIES } });
});

// Static segment, declared before the "/:category/:id" pattern.
router.get('/mine', requireAuth('user'), ctrl.getMyReports);

router.post(
  '/:category',
  requireAuth('user'),
  reportLimiter,
  uploadSingleImage,
  ctrl.createReport
);

router.get('/:category/:id', requireAuth(), ctrl.getReportById);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ngoAuth = require('../controllers/ngoAuthController');
const ngoReports = require('../controllers/ngoReportController');

const router = express.Router();

// ---- Organisation authentication ----
router.post('/login', authLimiter, ngoAuth.login);
router.post('/register', authLimiter, ngoAuth.register);

// Everything below requires a signed-in NGO.
router.use(requireAuth('ngo'));

router.get('/me', ngoAuth.me);
router.patch('/me', ngoAuth.updateProfile);

router.get('/reports', ngoReports.listReports);
router.get('/reports/stats', ngoReports.getStats);
router.patch('/reports/:category/:id/claim', ngoReports.claimReport);
router.patch('/reports/:category/:id/status', ngoReports.updateStatus);

module.exports = router;

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth(), ctrl.me);
router.patch('/me', requireAuth('user'), ctrl.updateProfile);

module.exports = router;

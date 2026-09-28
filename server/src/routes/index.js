const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const reportRoutes = require('./reportRoutes');
const adoptionRoutes = require('./adoptionRoutes');
const ngoRoutes = require('./ngoRoutes');
const { getSignupStats } = require('../controllers/statsController');
const aiRoutes = require('./aiRoutes');

const router = express.Router();

router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';

  res.status(dbState === 'connected' ? 200 : 503).json({
    success: dbState === 'connected',
    service: 'straycare-api',
    database: dbState,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/stats', getSignupStats);

router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);
router.use('/adoptions', adoptionRoutes);
router.use('/ngo', ngoRoutes);
router.use('/ai', aiRoutes);

module.exports = router;

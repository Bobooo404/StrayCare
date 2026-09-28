const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  },
};

/** Broad protection applied to the whole API. */
const apiLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

/** Tight limit on credential endpoints to slow down brute force attempts. */
const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 10 : 100,
  skipSuccessfulRequests: true,
});

/** Reports are the write-heavy path, capped separately. */
const reportLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
});

/**
 * Every AI triage call costs money and a real model round trip, so this is much
 * tighter than the general limit. Per user rather than per IP so one person on
 * shared wifi cannot lock out everyone else in the building.
 */
const aiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: env.isProduction ? 15 : 100,
  keyGenerator: (req) => (req.user ? String(req.user._id) : req.ip),
});

module.exports = { apiLimiter, authLimiter, reportLimiter, aiLimiter };

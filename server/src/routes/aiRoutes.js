const express = require('express');
const ctrl = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/** Public so the client can hide the AI entry points when no key is set. */
router.get('/status', ctrl.getStatus);

/**
 * Triage needs a signed in user, because the result is tied to a person who
 * will go on to submit a real report under their name.
 *
 * `requireAuth('user')` covers both checks: it rejects anonymous callers and
 * rejects an NGO cookie, so an organisation cannot submit triage under their
 * own account.
 */
router.post(
  '/triage',
  requireAuth('user'),
  aiLimiter,
  uploadSingleImage,
  ctrl.createTriage
);

/** Clinic search is cheap, but still signed in and still rate limited. */
router.get('/nearby', requireAuth(), aiLimiter, ctrl.getNearby);

module.exports = router;

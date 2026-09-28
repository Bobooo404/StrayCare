const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/adoptionController');

const router = express.Router();

// Browsing the adoption board is public - anyone can look for a pet.
router.get('/', ctrl.listAdoptions);

router.get('/mine', requireAuth('user'), ctrl.listMyAdoptions);

router.post(
  '/',
  requireAuth('user'),
  reportLimiter,
  uploadSingleImage,
  ctrl.createAdoption
);

router.patch('/:id', requireAuth('user'), uploadSingleImage, ctrl.updateAdoption);
router.delete('/:id', requireAuth('user'), ctrl.deleteAdoption);

module.exports = router;

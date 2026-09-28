const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const NGO = require('../models/NGO');

/**
 * Public signup counts for the landing page.
 *
 * Deliberately counts documents rather than tracking a counter, so the numbers
 * can never drift out of sync with the collections. Deactivated NGOs are
 * excluded because they cannot accept reports.
 */
const getSignupStats = asyncHandler(async (_req, res) => {
  const [users, ngos] = await Promise.all([
    User.countDocuments(),
    NGO.countDocuments({ isActive: true }),
  ]);

  res.json({
    success: true,
    data: { users, ngos },
  });
});

module.exports = { getSignupStats };

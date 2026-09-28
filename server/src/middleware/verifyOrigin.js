const env = require('../config/env');

/**
 * The auth cookie is httpOnly, so a cross-site page cannot read the token
 * directly - but it can still make the browser send the cookie. Rejecting
 * unexpected Origins on state-changing requests closes that CSRF hole.
 */
function verifyOrigin(req, _res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const origin = req.get('origin');

  // Non browser clients (curl, Postman, server to server) send no Origin.
  if (!origin) return next();

  const isAllowed =
    env.clientOrigins.includes(origin) ||
    // Same origin requests in production hit the API directly.
    origin === `${req.protocol}://${req.get('host')}`;

  if (!isAllowed) {
    return next({
      statusCode: 403,
      message: 'Request blocked: unrecognised origin',
    });
  }

  return next();
}

module.exports = { verifyOrigin };

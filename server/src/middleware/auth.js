const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const NGO = require('../models/NGO');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Both roles share one cookie, so the token's `role` decides which collection
 * the id is looked up in.
 */
const ROLE_COLLECTIONS = {
  user: User,
  ngo: NGO,
};

function extractToken(req) {
  const fromCookie = req.cookies?.[env.cookieName];
  if (fromCookie) return fromCookie;

  // Convenience for API clients such as Postman or curl.
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();

  return null;
}

const resolveSession = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const Model = ROLE_COLLECTIONS[payload.role];
    if (!Model) throw new Error('Unknown role in token');

    const account = await Model.findById(payload.sub);
    if (!account) throw new Error('Account no longer exists');

    req.auth = { id: account.id, role: payload.role, account };
    if (payload.role === 'user') req.user = account;
    if (payload.role === 'ngo') req.ngo = account;
  } catch {
    // An invalid/expired token is treated as "not signed in" rather than an
    // error, so the client can recover by logging in again.
    req.auth = null;
  }

  return next();
});

/**
 * Role guard. `requireAuth()` with no arguments accepts any signed in user, so
 * this is for the rarer case where an endpoint is user-only, such as the AI
 * triage helper which has no meaning for an NGO account.
 */
function requireRole(role) {
  return function roleGuard(req, _res, next) {
    if (!req.auth) {
      return next(ApiError.unauthorized('Please sign in to continue'));
    }
    if (req.auth.role !== role) {
      return next(
        ApiError.forbidden('This action is not available for your account type')
      );
    }
    return next();
  };
}

function requireAuth(...roles) {
  return function guard(req, _res, next) {
    if (!req.auth) {
      return next(ApiError.unauthorized('Please sign in to continue'));
    }
    if (roles.length && !roles.includes(req.auth.role)) {
      return next(
        ApiError.forbidden('This action is not available for your account type')
      );
    }
    return next();
  };
}

module.exports = { resolveSession, requireAuth, requireRole };

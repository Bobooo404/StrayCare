const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * The auth cookie is shared by users and NGOs, so the payload always carries a
 * `role`. `sub` is the document id in the matching collection.
 */
function signToken({ id, role, email }) {
  return jwt.sign({ role, email }, env.jwtSecret, {
    subject: String(id),
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

const cookieOptions = {
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

module.exports = { signToken, verifyToken, cookieOptions };

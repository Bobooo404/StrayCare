const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, cookieOptions } = require('../utils/token');
const { validators } = require('../utils/validate');
const env = require('../config/env');

const BCRYPT_ROUNDS = 12;

function sendAuthCookie(res, account, role) {
  const token = signToken({ id: account.id, role, email: account.email });
  res.cookie(env.cookieName, token, cookieOptions);
  return token;
}

/**
 * Shared credential check so users and NGOs behave identically.
 *
 * The password rules are re-checked here because Mongoose's `minlength` only
 * ever sees the bcrypt hash, never the plaintext the user typed.
 */
async function verifyCredentials(Model, email, password) {
  const normalisedEmail = validators.email(email);
  const rawPassword = validators.string(password, 'password', {
    max: 128,
    label: 'password',
  });

  const account = await Model.findOne({ email: normalisedEmail }).select('+password');

  // Compare against a real dummy hash when the account is missing so the
  // response time does not reveal whether an email is registered.
  const DUMMY_HASH = '$2a$12$N/k7kTwmeYXR24XJNRBBRO2hxSzeL2gZZOa8r6Y.pNjZUMsNixEFG';
  const isMatch = await bcrypt.compare(rawPassword, account?.password || DUMMY_HASH);

  return { account: isMatch ? account : null, isMatch };
}

const register = asyncHandler(async (req, res) => {
  const fullname = validators.string(req.body.fullname, 'fullname', {
    min: 3,
    max: 80,
    label: 'Full name',
  });
  const email = validators.email(req.body.email);
  // Validated before hashing - the hash would satisfy any length rule.
  const password = validators.password(req.body.password);
  const phone = validators.phone(req.body.phone, { label: 'phone number' });

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const user = await User.create({
    fullname,
    email,
    phone,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
  });

  sendAuthCookie(res, user, 'user');

  res.status(201).json({
    success: true,
    message: 'Account created. Welcome to StrayCare!',
    data: { user: user.toJSON() },
  });
});

const login = asyncHandler(async (req, res) => {
  const { account, isMatch } = await verifyCredentials(
    User,
    req.body.email,
    req.body.password
  );

  if (!isMatch) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  sendAuthCookie(res, account, 'user');

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: { user: account.toJSON() },
  });
});

const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
  });
  res.json({ success: true, message: 'Signed out successfully' });
});

/** Lets the React app restore the session on a hard refresh. */
const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      role: req.auth.role,
      account: req.auth.account.toJSON(),
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  if (req.body.fullname !== undefined) {
    user.fullname = validators.string(req.body.fullname, 'fullname', {
      min: 3,
      max: 80,
      label: 'Full name',
    });
  }
  if (req.body.phone !== undefined) {
    user.phone = validators.phone(req.body.phone, { label: 'phone number' });
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated',
    data: { user: user.toJSON() },
  });
});

module.exports = {
  register,
  login,
  logout,
  me,
  updateProfile,
  sendAuthCookie,
  verifyCredentials,
  BCRYPT_ROUNDS,
};

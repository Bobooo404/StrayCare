const bcrypt = require('bcryptjs');
const NGO = require('../models/NGO');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validators } = require('../utils/validate');
const {
  sendAuthCookie,
  verifyCredentials,
  BCRYPT_ROUNDS,
} = require('./authController');

const login = asyncHandler(async (req, res) => {
  const { account, isMatch } = await verifyCredentials(
    NGO,
    req.body.email,
    req.body.password
  );

  if (!isMatch) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  if (!account.isActive) {
    throw ApiError.forbidden(
      'This account has been deactivated. Please contact StrayCare support.'
    );
  }

  sendAuthCookie(res, account, 'ngo');

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: { ngo: account.toJSON() },
  });
});

/**
 * Self registration for animal welfare organisations. In a production system
 * this endpoint would be admin-only or require manual verification of the
 * registration number.
 */
const register = asyncHandler(async (req, res) => {
  const name = validators.string(req.body.name, 'name', {
    min: 3,
    max: 120,
    label: 'Organisation name',
  });
  const email = validators.email(req.body.email);
  const phone = validators.phone(req.body.phone, {
    required: true,
    label: 'phone number',
  });
  const password = validators.password(req.body.password);

  const existing = await NGO.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An organisation with that email already exists');
  }

  const ngo = await NGO.create({
    name,
    email,
    phone,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    registrationNumber: req.body.registrationNumber?.trim() || undefined,
    serviceArea: req.body.serviceArea?.trim() || undefined,
    description: req.body.description?.trim() || undefined,
  });

  sendAuthCookie(res, ngo, 'ngo');

  res.status(201).json({
    success: true,
    message: 'Organisation registered successfully',
    data: { ngo: ngo.toJSON() },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { ngo: req.ngo.toJSON() } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const ngo = req.ngo;
  const { name, phone, serviceArea, description } = req.body;

  if (name !== undefined) {
    ngo.name = validators.string(name, 'name', {
      min: 3,
      max: 120,
      label: 'Organisation name',
    });
  }
  if (phone !== undefined) {
    ngo.phone = validators.phone(phone, {
      required: true,
      label: 'phone number',
    });
  }
  if (serviceArea !== undefined) {
    ngo.serviceArea = validators.string(serviceArea, 'serviceArea', {
      max: 200,
      label: 'Service area',
    });
  }
  if (description !== undefined) {
    ngo.description = validators.string(description, 'description', {
      max: 1000,
      label: 'Description',
    });
  }

  await ngo.save();

  res.json({
    success: true,
    message: 'Organisation profile updated',
    data: { ngo: ngo.toJSON() },
  });
});

module.exports = { login, register, me, updateProfile };

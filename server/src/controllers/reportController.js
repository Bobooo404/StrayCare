const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toPublicUrl } = require('../middleware/upload');
const { validators } = require('../utils/validate');
const {
  getReportModel,
  isValidCategory,
  REPORT_CATEGORIES,
} = require('../config/reportRegistry');
  const { aggregateReports } = require('../services/reportService');
  const {
    ANIMAL_TYPES,
    URGENCY_LEVELS,
    SUGGESTED_CATEGORIES,
  } = require('../models/reportSchemaFactory');

  /**
   * Optional AI triage block, sent only when the reporter used the AI helper and
   * confirmed the result.
   *
   * Every field is re-validated here and anything unrecognised is dropped, so
   * the schema stays the only gate on what actually gets stored. `undefined`
   * is returned for a normal handwritten report, which leaves `aiTriage` absent
   * and tells an NGO the case was not AI assisted.
   */
  function buildAiTriage(input, fallbackCategory) {
    if (!input || typeof input !== 'object') return undefined;

    const rawSummary = typeof input.summary === 'string' ? input.summary.trim() : '';

    // A block with no summary is not a usable triage record, and `validators`
    // would throw on an empty string, so this is checked before validating.
    if (!rawSummary) return undefined;

    const oneOf = (value, allowed, fallback) =>
      allowed.includes(value) ? value : fallback;

    // Reports are submitted as multipart form data, where a checkbox arrives as
    // the string "true" rather than a boolean. Anything else is false, so a
    // stray is never inferred from a stray-looking value.
    const toBool = (value) => value === true || value === 'true' || value === '1';

    return {
      summary: validators.string(rawSummary, 'aiTriage.summary', {
        max: 4000,
        label: 'AI summary',
      }),
      // Trimmed directly rather than via `validators.string`, which rejects an
      // absent value outright. The AI is allowed to omit this without the
      // whole triage block being thrown away.
      likelySituation:
        typeof input.likelySituation === 'string'
          ? input.likelySituation.trim().slice(0, 200)
          : '',
      urgency: oneOf(input.urgency, URGENCY_LEVELS, 'moderate'),
      firstAid: Array.isArray(input.firstAid)
        ? input.firstAid
            .filter((step) => typeof step === 'string' && step.trim())
            .slice(0, 5)
            .map((step) => step.trim().slice(0, 220))
        : [],
      looksStray: toBool(input.looksStray),
      confidence: oneOf(input.confidence, ['low', 'medium', 'high'], 'low'),
      // Falls back to the collection the report is being written to, since
      // that is the truth even if the AI guessed a different one.
      suggestedCategory: oneOf(
        input.suggestedCategory,
        SUGGESTED_CATEGORIES,
        fallbackCategory
      ),
      animalType: oneOf(input.animalType, ANIMAL_TYPES, 'other'),
      model: String(input.model || '').trim().slice(0, 120),
      // The reporter read and confirmed this in the UI before submitting.
      reviewedByUser: true,
    };
  }

/** Turns the flat latitude/longitude form fields into a GeoJSON point. */
function buildLocation(body) {
  const hasCoords =
    body.latitude !== undefined && body.latitude !== '' &&
    body.longitude !== undefined && body.longitude !== '';

  const address = body.address
    ? validators.string(body.address, 'address', { max: 300, label: 'Address' })
    : undefined;

  if (!hasCoords) {
    return { location: undefined, address };
  }

  const lat = validators.number(body.latitude, 'Latitude', {
    min: -90,
    max: 90,
  });
  const lng = validators.number(body.longitude, 'Longitude', {
    min: -180,
    max: 180,
  });

  // GeoJSON stores [longitude, latitude].
  return {
    location: { type: 'Point', coordinates: [lng, lat] },
    address,
  };
}

function assertCategory(req) {
  const { category } = req.params;
  if (!isValidCategory(category)) {
    throw ApiError.badRequest(
      `Unknown report category "${category}". Use one of: ${REPORT_CATEGORIES.join(', ')}`
    );
  }
  return category;
}

/** POST /api/reports/:category */
const createReport = asyncHandler(async (req, res) => {
  const category = assertCategory(req);
  const Model = getReportModel(category);
  const user = req.user;

  const title = validators.string(req.body.title, 'title', {
    min: 5,
    max: 120,
    label: 'Title',
  });

  const description = validators.string(req.body.description, 'description', {
    min: 10,
    max: 2000,
    label: 'Description',
  });

  const animalType = validators.enum(req.body.animalType, ANIMAL_TYPES, {
    label: 'Animal type',
    required: false,
  });

  const contact = req.body.contact
    ? validators.phone(req.body.contact, { required: true, label: 'contact number' })
    : user.phone;

  if (!contact) {
    throw ApiError.badRequest(
      'A contact number is required so the NGO can reach you'
    );
  }

  const { location, address } = buildLocation(req.body);
  const aiTriage = buildAiTriage(req.body.aiTriage, category);

  const report = await Model.create({
    category,
    reporterName: user.fullname,
    contact,
    animalType: animalType || 'other',
    title,
    description,
    imageUrl: req.file ? toPublicUrl(req.file.filename) : null,
    location,
    address,
    ...(aiTriage ? { aiTriage } : {}),
    reportedBy: user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Report submitted. A nearby NGO has been notified.',
    data: { report },
  });
});

/** GET /api/reports/mine */
const getMyReports = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

  const categories =
    req.query.category && isValidCategory(req.query.category)
      ? [req.query.category]
      : REPORT_CATEGORIES;

  const { data, total } = await aggregateReports({
    filter: { reportedBy: req.user._id },
    categories,
    skip: (page - 1) * limit,
    limit,
  });

  res.json({
    success: true,
    data: { reports: data },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

/** GET /api/reports/:category/:id - visible to the owner and to NGOs. */
const getReportById = asyncHandler(async (req, res) => {
  const category = assertCategory(req);
  validators.objectId(req.params.id, 'report id');

  const Model = getReportModel(category);

  const report = await Model.findById(req.params.id)
    .populate('assignedNGO', 'name phone')
    .populate('reportedBy', 'fullname email')
    .lean();

  if (!report) throw ApiError.notFound('Report not found');

  const isOwner =
    req.auth?.role === 'user' &&
    String(report.reportedBy?._id) === String(req.user._id);

  if (!isOwner && req.auth?.role !== 'ngo') {
    throw ApiError.forbidden('You cannot view this report');
  }

  res.json({ success: true, data: { report } });
});

module.exports = { createReport, getMyReports, getReportById };

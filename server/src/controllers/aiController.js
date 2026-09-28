const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validators } = require('../utils/validate');
const { triageAnimal, isConfigured } = require('../services/geminiService');
const { findNearbyPlaces } = require('../services/placesService');

/**
 * POST /api/ai/triage
 *
 * Takes the photo and description the reporter typed, returns a triage summary
 * plus the nearest clinics. Nothing is written to the database here: the
 * reporter reviews this and only then submits an ordinary report through
 * POST /api/reports/:category, which is what an NGO eventually claims.
 */
const createTriage = asyncHandler(async (req, res) => {
  if (!isConfigured()) {
    throw ApiError.internal(
      'AI triage is not configured yet. Add GEMINI_API_KEY to server/.env and restart the API.'
    );
  }

  // `validators.string` rejects an absent value, which is fine here because the
  // photo alone is enough for the AI to work from.
  const description = req.body.description
    ? validators.string(req.body.description, 'description', {
        max: 1000,
        label: 'description',
      })
    : '';

  if (!description && !req.file) {
    throw ApiError.badRequest(
      'Add a photo or describe the animal so the AI has something to work from.'
    );
  }

  // Deleted even when triage throws, otherwise a failed request would leave the
  // uploaded photo sitting in the uploads folder forever.
  if (req.file) {
    const discard = () =>
      fs.promises.unlink(req.file.path).catch(() => {
        // A leftover temp file is not worth failing the request over.
      });
    res.on('finish', discard);
    res.on('close', discard);
  }

  const triage = await triageAnimal({
    description,
    imagePath: req.file ? req.file.path : null,
    mimeType: req.file ? req.file.mimetype : null,
  });

  // Clinic lookup is best effort. A triage summary is still useful without it,
  // and a flaky third party should not throw away the whole response.
  let nearby = [];
  let nearbyError = null;

  // Only runs when the browser has already resolved coordinates. The AI
  // endpoint does not geocode free text, so without these the user would get a
  // summary but no clinics.
  const { latitude, longitude } = req.body;
  if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    try {
      const result = await findNearbyPlaces({
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      nearby = result.places;
    } catch (err) {
      nearbyError = err.message;
    }
  }

  res.status(201).json({
    success: true,
    message: 'Triage ready for review',
    data: {
      triage,
      nearby,
      nearbyError,
      // Shown in the UI so nobody mistakes this for a veterinary diagnosis.
      disclaimer:
        'This is an automated first impression, not a veterinary diagnosis. Please have the animal examined by a vet.',
    },
  });
});

/**
 * GET /api/ai/nearby?lat=&lng=
 *
 * Standalone clinic search, so the report form can refresh nearby clinics
 * without paying for another AI call.
 */
const getNearby = asyncHandler(async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw ApiError.badRequest('We need a valid map location to find nearby clinics.');
  }

  const result = await findNearbyPlaces({ latitude, longitude });

  res.json({
    success: true,
    data: { places: result.places, searchedRadiusKm: result.searchedRadiusKm },
  });
});

/**
 * GET /api/ai/status
 *
 * Lets the client hide the AI entry points entirely when no key is configured,
 * rather than letting a user start a flow that cannot finish.
 */
const getStatus = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: { configured: isConfigured() },
  });
});

module.exports = { createTriage, getNearby, getStatus };

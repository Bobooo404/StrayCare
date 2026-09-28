const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Nearby vet clinics and animal shelters, from the free OpenStreetMap
 * Overpass API. No API key and no billing account, which is why it was chosen
 * over Google Places for this project.
 *
 * Coverage in India is much thinner than Google's, so `findNearbyPlaces` is
 * written to degrade gracefully: an empty or partial result set is a normal
 * outcome, not an error, and the UI tells the user to phone around instead.
 */

const RADIUS = 20000; // metres
// The public Overpass instance regularly needs 5-8s for a query this size, and
// returns a slow 504 if cut off too early. The abort is set above the server
// side timeout so Overpass's own `timeout=` produces a clean error first.
const TIMEOUT_MS = 25000;
const OVERPASS_TIMEOUT_S = 20;
const MAX_RESULTS = 8;

/**
 * Values of `amenity` in OSM that count as somewhere that would treat an
 * animal. `veterinary` is rare enough in India that the general medical
 * fallbacks matter.
 */
const PLACE_FILTER = `
  ["amenity"~"^(veterinary|clinic|hospital|doctors)$"]
`;

const SHELTER_FILTER = `
  ["amenity"="animal_shelter"]
`;

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= MIN_LAT &&
    latitude <= MAX_LAT &&
    longitude >= MIN_LNG &&
    longitude <= MAX_LNG
  );
}

/** Great-circle distance in kilometres. */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * `relation` is deliberately left out. The Overpass instance rejects the
 * combined query when relation variants are included, and relations are not
 * where clinics are mapped in practice.
 *
 * Disused places are skipped in JS rather than with an `out` filter, because a
 * bare `["disused"="yes"]` filter on the `out` statement makes Overpass return
 * a 400 for the whole query.
 */
function buildQuery(latitude, longitude) {
  return `
[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  node${PLACE_FILTER}(around:${RADIUS},${latitude},${longitude});
  way${PLACE_FILTER}(around:${RADIUS},${latitude},${longitude});
  node${SHELTER_FILTER}(around:${RADIUS},${latitude},${longitude});
  way${SHELTER_FILTER}(around:${RADIUS},${latitude},${longitude});
);
out center tags;
`.trim();
}

function pickTags(element, latitude, longitude) {
  const tags = element.tags || {};

  // `out center` puts the representative point on ways and relations; nodes
  // carry their own lat/lon. A centre can be missing in rare cases.
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  const name = (tags.name || tags['name:en'] || '').trim();
  if (!name) return null;
  if (!isValidCoordinate(lat, lon)) return null;

  // Closed or demolished places are still in the OSM data, so they are dropped
  // here instead of with an Overpass output filter.
  if (tags.disused === 'yes' || tags.disused === 'true') return null;
  if (tags.abandoned === 'yes' || tags.closed === 'yes') return null;

  const isShelter = tags.amenity === 'animal_shelter';
  const kind = isShelter
    ? 'shelter'
    : tags.amenity === 'veterinary'
      ? 'veterinary'
      : 'clinic';

  const phone =
    tags.phone ||
    tags['contact:phone'] ||
    tags['phone:mobile'] ||
    tags['contact:mobile'] ||
    null;

  const address = [
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
  ]
    .filter(Boolean)
    .join(', ');

  return {
    id: String(element.id),
    name,
    kind,
    // Only offer a call button when OSM actually has a number.
    phone,
    phoneUrl: phone ? `tel:${phone.replace(/\s+/g, '')}` : null,
    address: address || null,
    latitude: lat,
    longitude: lon,
    distanceKm: Number(distanceKm(latitude, longitude, lat, lon).toFixed(1)),
  };
}

/**
 * Returns the closest clinics and shelters to a point.
 *
 * @throws {ApiError} 400 for an unusable coordinate, 503 when Overpass is down
 */
async function findNearbyPlaces({ latitude, longitude, limit = MAX_RESULTS }) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw ApiError.badRequest('We need a valid map location to find nearby clinics.');
  }

  let response;
  try {
    response = await fetch(env.overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass mirrors rate limit or hard reject requests that do not
        // identify themselves, and the main instance returns 406 for them.
        Accept: 'application/json',
          'User-Agent': 'StrayCare/1.0 (animal welfare triage; contact via project repo)',
      },
      body: new URLSearchParams({ data: buildQuery(latitude, longitude) }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError(
        503,
        'The clinic search timed out. Please try again in a moment.'
      );
    }
    throw new ApiError(503, 'Could not reach the clinic search service.');
  }

  if (response.status === 429 || response.status === 504) {
    throw new ApiError(503, 'The clinic search service is busy. Please try again shortly.');
  }

  if (!response.ok) {
    throw new ApiError(503, 'The clinic search service is unavailable right now.');
  }

  const payload = await response.json();
  const elements = Array.isArray(payload?.elements) ? payload.elements : [];

  const seen = new Set();
  const places = [];

  for (const element of elements) {
    const place = pickTags(element, latitude, longitude);
    if (!place) continue;

    // Overpass returns a node and a way for the same building, so dedupe on
    // name plus rounded position to avoid showing the same clinic twice.
    const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    places.push(place);
  }

  places.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    places: places.slice(0, limit),
    // Surfaced so the client can be honest about a thin result set instead of
    // implying it found everything nearby.
    searchedRadiusKm: RADIUS / 1000,
  };
}

module.exports = { findNearbyPlaces, distanceKm, isValidCoordinate };

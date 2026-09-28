const { distanceKm, isValidCoordinate } = require('../src/services/placesService');

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else {
    failed += 1;
    console.error(`  FAIL ${name}\n    expected ${JSON.stringify(expected)}\n    got      ${JSON.stringify(actual)}`);
  }
}

console.log('placesService unit tests');

// Panaji to Margao is roughly 28-29 km as the crow flies, verified against an
// independent haversine implementation.
const panaji = { lat: 15.4909, lng: 73.8278 };
const margao = { lat: 15.2832, lng: 73.9862 };
const d = distanceKm(panaji.lat, panaji.lng, margao.lat, margao.lng);
check('distance to same point is 0', distanceKm(15.49, 73.83, 15.49, 73.83), 0);
if (d > 28 && d < 29) passed += 1;
else {
  failed += 1;
  console.error(`  FAIL Panaji->Margao expected 28-29km, got ${d.toFixed(1)}`);
}

check('valid coords accepted', isValidCoordinate(15.49, 73.83), true);
check('lat > 90 rejected', isValidCoordinate(91, 73.83), false);
check('lng > 180 rejected', isValidCoordinate(15.49, 181), false);
check('NaN rejected', isValidCoordinate(NaN, 73.83), false);
// Deliberately strict: `isValidCoordinate` only accepts real numbers, because
// callers coerce query/form values with `Number()` first. A string slipping
// through here would reach Overpass as an unquoted invalid value.
check('string rejected by design', isValidCoordinate('15.49', 73.83), false);
check('null rejected', isValidCoordinate(null, 73.83), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

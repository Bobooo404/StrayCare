const {
  normaliseTriage,
  parseModelJson,
  resolveImageMimeType,
  buildPrompt,
} = require('../src/services/geminiService');

/**
 * Unit tests for the pure parts of the Gemini service.
 *
 * The network call itself is not covered here: it needs a real API key, so the
 * smoke suite only checks that the endpoint refuses to run without one. What
 * matters and can be tested offline is that an odd model response is coerced
 * into the exact shape the schema, the report model and the client all expect.
 */

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else {
    failed += 1;
    console.error(
      `  FAIL ${name}\n    expected ${JSON.stringify(expected)}\n    got      ${JSON.stringify(actual)}`
    );
  }
}

function throws(name, fn) {
  try {
    fn();
    failed += 1;
    console.error(`  FAIL ${name}: expected a throw, but none happened`);
  } catch {
    passed += 1;
  }
}

console.log('geminiService unit tests');

// --- parseModelJson ---------------------------------------------------------

check('bare JSON', parseModelJson('{"urgency":"high"}'), { urgency: 'high' });
check('fenced JSON', parseModelJson('```json\n{"urgency":"low"}\n```'), { urgency: 'low' });
check('prose around JSON', parseModelJson('Sure!\n{"urgency":"low"}\nDone.'), {
  urgency: 'low',
});
check('nested braces survive', parseModelJson('{"a":{"b":1}}'), { a: { b: 1 } });
throws('empty response', () => parseModelJson(''));
throws('no object in response', () => parseModelJson('I cannot help with that.'));
throws('truncated JSON', () => parseModelJson('{"urgency":'));

// --- normaliseTriage --------------------------------------------------------

const good = normaliseTriage({
  summary: 'Bleeding from the front leg.',
  likelySituation: 'Collision injury',
  urgency: 'critical',
  firstAid: ['Apply pressure.', 'Keep it warm.'],
  looksStray: true,
  confidence: 'medium',
  suggestedCategory: 'injured',
  animalType: 'dog',
});
check('valid response passes through', good, {
  summary: 'Bleeding from the front leg.',
  likelySituation: 'Collision injury',
  urgency: 'critical',
  firstAid: ['Apply pressure.', 'Keep it warm.'],
  looksStray: true,
  confidence: 'medium',
  suggestedCategory: 'injured',
  animalType: 'dog',
});

check(
  'unknown urgency falls back to moderate',
  normaliseTriage({ summary: 'x', urgency: 'urgent' }).urgency,
  'moderate'
);
check(
  'unknown category falls back to stray',
  normaliseTriage({ summary: 'x', suggestedCategory: 'abandoned' }).suggestedCategory,
  'stray'
);
check(
  'unknown animal falls back to other',
  normaliseTriage({ summary: 'x', animalType: 'hippo' }).animalType,
  'other'
);
// A rescue sees these constantly in India, and the model has to be able to say
// so. Dropping them into "other" loses information an NGO filters on.
check('rabbit is accepted', normaliseTriage({ summary: 'x', animalType: 'rabbit' }).animalType, 'rabbit');
check('donkey is accepted', normaliseTriage({ summary: 'x', animalType: 'donkey' }).animalType, 'donkey');
check('squirrel is accepted', normaliseTriage({ summary: 'x', animalType: 'squirrel' }).animalType, 'squirrel');
// The model claiming certainty about ownership is exactly what the system
// prompt tells it not to do, so anything other than a real `true` becomes false.
check('truthy non-boolean is not stray', normaliseTriage({ summary: 'x', looksStray: 'yes' }).looksStray, false);
check('non-array firstAid becomes empty', normaliseTriage({ summary: 'x', firstAid: 'one step' }).firstAid, []);
check('firstAid is capped at 5', normaliseTriage({ summary: 'x', firstAid: ['a', 'b', 'c', 'd', 'e', 'f'] }).firstAid.length, 5);
check('blank steps are dropped', normaliseTriage({ summary: 'x', firstAid: ['ok', '  ', ''] }).firstAid, ['ok']);
check('missing summary still returns text', typeof normaliseTriage({}).summary, 'string');
check('long summary is trimmed', normaliseTriage({ summary: 'a'.repeat(5000) }).summary.length, 4000);

// --- resolveImageMimeType ---------------------------------------------------

check('multer mime wins', resolveImageMimeType('image/png', 'x.jpg'), 'image/png');
check('uppercase mime normalised', resolveImageMimeType('IMAGE/PNG', 'x.jpg'), 'image/png');
check('png extension used when no mime', resolveImageMimeType(null, 'photo.png'), 'image/png');
check('webp extension used when no mime', resolveImageMimeType(undefined, 'photo.WEBP'), 'image/webp');
// A non-image type must never reach Gemini as-is.
check('svg rejected as image mime', resolveImageMimeType('image/svg+xml', 'x.svg'), 'image/jpeg');
check('unknown extension falls back to jpeg', resolveImageMimeType(null, 'photo.bin'), 'image/jpeg');
check('no extension falls back to jpeg', resolveImageMimeType(null, 'tmpfile'), 'image/jpeg');

// --- buildPrompt ------------------------------------------------------------

check(
  'prompt mentions the photo when present',
  buildPrompt('bleeding', true).includes('A photo of the animal is attached'),
  true
);
check(
  'prompt says so when there is no photo',
  buildPrompt('bleeding', false).includes('No photo was attached'),
  true
);
check('prompt carries the description', buildPrompt('bleeding', true).includes('bleeding'), true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

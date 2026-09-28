const fs = require('fs');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Default model. `gemini-2.5-flash` is no longer callable by new API keys and
 * returns 404, so this is the current vision-capable flash model.
 */
const MODEL_WITH_VISION = 'gemini-3.8-flash';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Keeps the model on describing the animal rather than diagnosing it.
 *
 * The distinction matters for a real user: telling someone the right first aid
 * step is useful, telling them a drug and a dose is dangerous and outside what
 * a triage helper should be doing.
 */
const SYSTEM_INSTRUCTION = `You are the animal triage assistant inside StrayCare, an Indian animal welfare platform. A member of the public has found an animal and needs to know how serious it is and what to do right now.

Rules you must always follow:
- Describe what you can actually observe in the photo and the description. Never invent symptoms, and never claim certainty you do not have.
- You are NOT a veterinarian. Never diagnose a specific disease, never name a specific medication, never give a dosage. General, safe, widely accepted first aid only.
- If the animal may be in danger, say so plainly and early. Do not bury an emergency under general advice.
- If the photo is not of an animal, or is too unclear to judge, say so plainly and set confidence to "low". Do not guess.
- Judge whether the animal looks like a stray from the photo and description only, and treat that as uncertain. A confident-looking animal may simply be a pet that wandered off.
- Speak plainly and calmly. The reader is likely stressed and standing on a roadside in India.
- Use British English. Short sentences.

Set urgency as:
- "critical" - life threatening right now: heavy bleeding, seizure, unable to breathe, collapse, severe trauma, suspected poisoning
- "high" - needs attention within hours: limping, bleeding that has slowed, vomiting, not eating, eye injury, suspected fracture
- "moderate" - needs attention today: minor wound, skin problem, mild infection, appears weak
- "low" - can wait: mild parasite issue, minor irritation, appears generally well

Return only the JSON object described, with no markdown fences and no commentary.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'A short plain-English triage summary, 2 to 4 sentences, describing what you can see and what it most likely means. No diagnosis, no medication.',
    },
    likelySituation: {
      type: 'string',
      description:
        'Short label for the situation, up to 8 words, e.g. "Front leg injury after a collision".',
    },
    urgency: {
      type: 'string',
      enum: ['low', 'moderate', 'high', 'critical'],
    },
    firstAid: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Up to 5 short, safe, general first aid steps the person can take now. No medication names and no dosages.',
    },
    looksStray: {
      type: 'boolean',
      description:
        'True only if the animal appears to have no owner. If it is ambiguous, return false.',
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description:
        'How confident you are in the urgency rating. "low" whenever the photo is unclear or the description is vague.',
    },
    suggestedCategory: {
      type: 'string',
      enum: ['stray', 'lost', 'injured'],
      description:
        '"injured" if the animal is hurt or unwell, "lost" if it looks owned and the person is searching for its owner, otherwise "stray".',
    },
    animalType: {
      type: 'string',
      enum: [
        'dog',
        'cat',
        'bird',
        'cow',
        'goat',
        'monkey',
        'rabbit',
        'pig',
        'horse',
        'donkey',
        'squirrel',
        'other',
      ],
    },
  },
  required: [
    'summary',
    'likelySituation',
    'urgency',
    'firstAid',
    'looksStray',
    'confidence',
    'suggestedCategory',
    'animalType',
  ],
};

function isConfigured() {
  return Boolean(env.geminiApiKey);
}

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/**
 * Gemini rejects the request if the declared type does not match the bytes, so
 * an assumed "image/jpeg" breaks every PNG and WebP upload. Trust multer's
 * sniffed type first, then the file extension, and only fall back to JPEG.
 */
function resolveImageMimeType(mimeType, imagePath) {
  if (typeof mimeType === 'string' && ALLOWED_IMAGE_MIME.has(mimeType.toLowerCase())) {
    return mimeType.toLowerCase();
  }

  const extension = (imagePath ?? '').split('.').pop()?.toLowerCase();
  const byExtension = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  return byExtension[extension] ?? 'image/jpeg';
}

function buildPrompt(description, hasPhoto) {
  const lines = [
    'A member of the public used the StrayCare AI triage helper. Assess the animal below.',
    '',
  ];

  if (hasPhoto) {
    lines.push('A photo of the animal is attached. Use it.');
  } else {
    lines.push(
      'No photo was attached. Base your assessment on the description only, and keep confidence at "low".'
    );
  }

  lines.push('', 'Their description:', description || '(none given)');
  lines.push(
    '',
    'Return the JSON object only. Write every string in plain English suitable for a non-expert.'
  );

  return lines.join('\n');
}

/**
 * Pulls the JSON object out of a model response.
 *
 * Gemini normally returns bare JSON when a response schema is supplied, but
 * the text field is the only thing that comes back, so the object is extracted
 * defensively rather than trusting the caller's format.
 */
function parseModelJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw ApiError.internal('The AI returned an empty response. Please try again.');
  }

  const trimmed = text.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw ApiError.internal('The AI response could not be read. Please try again.');
  }

  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch {
    throw ApiError.internal('The AI response could not be read. Please try again.');
  }
}

function normaliseList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, 5)
    .map((item) => item.trim().slice(0, 220));
}

function normaliseText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Coerces whatever the model returned into the exact shape the schema and the
 * client expect. Anything unrecognised falls back to a safe default rather than
 * failing the whole request, so a slightly odd response still helps the user.
 */
function normaliseTriage(raw) {
  const allowed = (value, list, fallback) => (list.includes(value) ? value : fallback);

  return {
    summary: normaliseText(raw.summary, 4000) || 'No summary was returned.',
    likelySituation: normaliseText(raw.likelySituation, 200),
    urgency: allowed(raw.urgency, ['low', 'moderate', 'high', 'critical'], 'moderate'),
    firstAid: normaliseList(raw.firstAid),
    looksStray: raw.looksStray === true,
    confidence: allowed(raw.confidence, ['low', 'medium', 'high'], 'low'),
    suggestedCategory: allowed(
      raw.suggestedCategory,
      ['stray', 'lost', 'injured'],
      'stray'
    ),
    animalType: allowed(
      raw.animalType,
      [
        'dog',
        'cat',
        'bird',
        'cow',
        'goat',
        'monkey',
        'rabbit',
        'pig',
        'horse',
        'donkey',
        'squirrel',
        'other',
      ],
      'other'
    ),
  };
}

/** Statuses worth another attempt: capacity and quota hiccups, not bad input. */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 25000;
const BACKOFF_MS = [900, 2500];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One HTTP attempt.
 *
 * Returns the raw payload, or throws an ApiError for a failure that retrying
 * cannot fix. Split out from the retry loop so the loop stays readable and the
 * request body is built once.
 */
async function callGemini(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw ApiError.internal('The AI took too long to respond. Please try again.');
    }
    throw ApiError.internal('Could not reach the AI service. Please try again.');
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    // Never surface the raw body: it can echo the key back in an error.
    throw ApiError.internal(
      'The AI service rejected the request. Check that GEMINI_API_KEY in server/.env is valid.'
    );
  }

  if (response.status === 404) {
    // The usual cause is a model that has been retired for new keys, e.g.
    // gemini-2.5-flash, which still appears in the model list but refuses to
    // generate. Naming the variable turns an opaque failure into a one line fix.
    throw ApiError.internal(
      `The AI model is not available to this API key. Update GEMINI_MODEL in server/.env to a current vision model.`
    );
  }

  if (RETRYABLE.has(response.status)) {
    const err = new Error('transient');
    err.retryable = true;
    // Gemini tells us how long to wait when it is throttling us. Honouring it
    // beats a fixed guess, and it is the difference between recovering and
    // burning the last attempt.
    const header = response.headers.get('retry-after');
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      err.retryAfterMs = Math.min(seconds * 1000, 8000);
    }
    throw err;
  }

  if (!response.ok) {
    throw ApiError.internal('The AI service is unavailable right now. Please try again.');
  }

  return response.json();
}

/**
 * Runs one triage turn against Gemini.
 *
 * `imagePath` is read from disk here on the server. The API key never leaves the
 * server and the photo is never sent anywhere but Google.
 *
 * Retries are not optional here: on a free tier roughly half of all calls come
 * back 503 with "high demand", which would otherwise surface to the reporter as
 * a failed triage they did nothing wrong to cause.
 */
async function triageAnimal({ description, imagePath, mimeType }) {
  if (!isConfigured()) {
    throw ApiError.internal(
      'AI triage is not configured yet. Add GEMINI_API_KEY to server/.env and restart the API.'
    );
  }

  const parts = [{ text: buildPrompt(description, Boolean(imagePath)) }];

  if (imagePath) {
    let buffer;
    try {
      buffer = fs.readFileSync(imagePath);
    } catch {
      throw ApiError.badRequest('The photo could not be read. Please upload it again.');
    }

    parts.push({
      inline_data: {
        mime_type: resolveImageMimeType(mimeType, imagePath),
        data: buffer.toString('base64'),
      },
    });
  }

  const model = env.geminiModel || MODEL_WITH_VISION;
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      // Gemini 3 flash is a thinking model and spends part of the budget on
      // reasoning, so this has to leave room for the JSON plus those tokens.
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let payload;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      payload = await callGemini(url, body);
      break;
    } catch (err) {
      if (!err.retryable || attempt === MAX_ATTEMPTS) {
        throw err.retryable
          ? ApiError.internal('The AI service is busy right now. Please try again shortly.')
          : err;
      }
      await sleep(err.retryAfterMs ?? BACKOFF_MS[attempt - 1] ?? 1000);
    }
  }

  const candidate = payload?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  // A "finishReason" of SAFETY means the image was blocked. That is not a bug
  // and not the user's fault, so it gets its own honest message.
  if (!text && candidate?.finishReason === 'SAFETY') {
    throw ApiError.internal(
      'This image could not be assessed. Try a clearer photo that focuses on the animal.'
    );
  }

  if (!text && candidate?.finishReason === 'MAX_TOKENS') {
    throw ApiError.internal(
      'The AI ran out of room before finishing. Please shorten the description and try again.'
    );
  }

  return { ...normaliseTriage(parseModelJson(text)), model };
}

module.exports = {
  triageAnimal,
  isConfigured,
  MODEL_WITH_VISION,
  // Exported for unit tests only. Nothing outside the service should call them.
  normaliseTriage,
  parseModelJson,
  resolveImageMimeType,
  buildPrompt,
};

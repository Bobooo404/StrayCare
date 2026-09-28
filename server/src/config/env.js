require('dotenv').config();

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/straycare',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'straycare_token',
  cookieSecure: process.env.COOKIE_SECURE === '1',
  clientOrigins: toList(process.env.CLIENT_ORIGIN).length
    ? toList(process.env.CLIENT_ORIGIN)
    : ['http://localhost:5173'],

  // AI triage. The key is optional so the rest of the app keeps working without
  // it; the AI routes return a clear message when it is missing.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  overpassUrl: process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',

  isProduction: process.env.NODE_ENV === 'production',
};

if (env.isProduction && env.jwtSecret === 'dev_only_insecure_secret') {
  throw new Error('JWT_SECRET must be set to a real secret in production.');
}

// A weak or placeholder secret would let anyone mint a session cookie, so
// refuse to start in production rather than silently running insecurely.
if (
  env.isProduction &&
  ['replace_this_with_a_long_random_string', 'dev_only_insecure_secret'].includes(env.jwtSecret)
) {
  throw new Error(
    'JWT_SECRET is still the example value. Generate a real secret with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

module.exports = env;

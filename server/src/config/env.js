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
  // `lax` while the API is same origin with the client. Split the two across
  // hosts (frontend on Netlify, API on Render/Railway) and it has to become
  // `none`, otherwise the browser refuses to send the cookie on the API calls
  // and every request looks like it is logged out.
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  clientOrigins: toList(process.env.CLIENT_ORIGIN).length
    ? toList(process.env.CLIENT_ORIGIN)
    : ['http://localhost:5173'],

  // Public origin of this API, used to build absolute URLs for uploaded files.
  // The client renders `imageUrl` straight into an `img src`, so a root
  // relative `/uploads/x.png` would resolve against the frontend's domain and
  // 404 once the two are on different hosts. Leave empty when they are together.
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),

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

if (
  env.isProduction &&
  env.cookieSameSite.toLowerCase() === 'none' &&
  !env.cookieSecure
) {
  // Browsers discard a SameSite=None cookie that is not also Secure, so a half
  // configured deployment would silently log everyone out rather than fail.
  throw new Error(
    'COOKIE_SAME_SITE=none requires COOKIE_SECURE=1. Browsers reject a ' +
      'SameSite=None cookie without the Secure flag.'
  );
}

module.exports = env;

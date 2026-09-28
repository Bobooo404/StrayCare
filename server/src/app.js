const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { resolveSession } = require('./middleware/auth');
const { verifyOrigin } = require('./middleware/verifyOrigin');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Images are served to a Vite dev server on another port, so the default
    // same-origin resource policy would block them.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / non browser requests arrive without an Origin header.
      if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
      // Do not throw here: throwing turns a blocked cross origin write into a
      // 500. Returning false omits the CORS headers, and verifyOrigin below
      // rejects the actual request with a clear 403.
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

if (!env.isProduction) {
  app.use(morgan('dev'));
}

// Uploaded evidence photos. Only images land here, and filenames are generated
// server side, so serving the folder statically is safe.
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '7d',
    index: false,
  })
);

app.use('/api', apiLimiter, verifyOrigin, resolveSession, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

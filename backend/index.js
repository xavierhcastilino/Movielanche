require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./config/db');
const { rateLimit } = require('./config/rateLimit');
const moviesRouter = require('./routes/movies');
const showsRouter = require('./routes/shows');
const authRouter = require('./routes/auth');
const bookingsRouter = require('./routes/bookings');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Behind a reverse proxy, req.ip is the proxy's address unless Express is told
// to trust the hop -- which would make every caller share one rate-limit bucket.
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Static frontend files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rate limits are per-IP and configurable. The defaults are deliberately
// generous enough that teammates sharing one office NAT don't lock each other
// out, while still throttling credential stuffing (bcrypt makes each attempt
// expensive, so this is a DoS control as much as a brute-force control).
// Set RATE_LIMIT_MAX=0 to disable -- useful for load testing only.
const isTest = process.env.NODE_ENV === 'test';
const RATE_LIMIT_MAX = isTest ? 0 : parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
const limit = (windowMs, max, message) =>
  RATE_LIMIT_MAX === 0
    ? (req, res, next) => next()
    : rateLimit({ windowMs, max, message });

// General abuse ceiling on the API surface.
app.use('/api', limit(60 * 1000, 300));


app.get('/api/health', async (req, res) => {
  // Never echo err.message: a connection failure can carry the hostname, port
  // and user of the production database.
  return res.json({ status: 'ok', database: 'connected' });
});

// API routes
app.use('/api/auth', limit(15 * 60 * 1000, 40), authRouter);
app.use('/api/bookings', limit(60 * 1000, 60), bookingsRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/shows', showsRouter);

// Unknown /api paths must return JSON, never the SPA shell -- otherwise a
// frontend parsing a 404 body gets HTML and fails with a confusing error.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// SPA fallback for everything else -- but a request for a real asset that does
// not exist must 404 honestly rather than return index.html with a 200.
app.use((req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Terminal error handler.
 *
 * Express's default handler renders HTML with a stack trace, which leaks source
 * paths and contradicts the documented "all errors are JSON" contract. This
 * keeps every failure shape -- thrown TypeError, malformed JSON body from
 * express.json(), oversized payload -- on the same JSON envelope.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Body parser failures arrive as 400 with a status/type marker.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Request body is not valid JSON' },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
    });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('Unhandled error:', err);
  }

  return res.status(status).json({
    error: {
      code: status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR',
      // In production the detail stays in the log, not the response.
      message: isProd ? 'Something went wrong' : err.message,
    },
  });
});

/** Verifies config at boot so a bad .env fails immediately and loudly. */
function assertConfig() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a strong secret.');
  }
  if (process.env.JWT_SECRET === 'dev-only-change-me' && isProd) {
    throw new Error('JWT_SECRET is still the example value. Generate a real secret before deploying.');
  }
}

async function main() {
  assertConfig();
  await db.connect();
  console.log('Connected to PostgreSQL');

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Drain in-flight requests before exiting, so a deploy or restart never cuts
  // a booking off mid-transaction.
  const shutdown = (signal) => () => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await db.close().catch(() => {});
      process.exit(0);
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
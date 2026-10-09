const { Pool, types } = require('pg');
require('dotenv').config();

/**
 * Postgres DATE (OID 1082) is a calendar date with no time and no timezone, but
 * node-pg's default parser builds a JS Date at *local* midnight. On a server
 * east of UTC (IST is +05:30) .toISOString() then shifts it back a day, so a
 * show on the 9th is served to the client as the 8th.
 *
 * Returning the raw 'YYYY-MM-DD' string removes the conversion entirely -- the
 * right fix is to never let a timezone-free column become an instant.
 * TIMESTAMPTZ (created_at) keeps the default Date parser, since that one is a
 * real point in time and should serialise as ISO.
 */
types.setTypeParser(1082, (value) => value);

/**
 * Postgres pool.
 *
 * Only the explicit DB_* names below are honoured, never USERNAME/PASSWORD --
 * generic OS variables that on a shared host could silently become the
 * database password.
 *
 * TLS: hosted providers (Neon, Supabase, RDS) require SSL and present a real
 * certificate chain, so verification stays ON. `DB_SSL_REJECT_UNAUTHORIZED=false`
 * is an explicit, opt-in escape hatch for a provider with a self-signed cert --
 * turning it off globally would allow a MITM against the production database.
 * A localhost DATABASE_URL is treated as local, so local dev over a plain
 * connection string still works.
 */
const isLocal = /^(localhost|127\.0\.0\.1|movielanche-pg|postgres)$/i.test(
  process.env.DB_HOST || ''
);
const usingUrl = Boolean(process.env.DATABASE_URL);
const urlIsLocal = usingUrl && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:|%)/.test(
  process.env.DATABASE_URL
);
const treatAsLocal = !usingUrl ? isLocal : urlIsLocal;

// Verification on for any remote database; off only for a local one.
const rejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true;

const poolConfig = usingUrl
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'movielanche',
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const pool = new Pool({
  ...poolConfig,
  ssl: treatAsLocal ? undefined : { rejectUnauthorized },
  max: 10,
  idleTimeoutMillis: 30000,
  // Without these a saturated pool makes requests hang forever instead of
  // failing fast, which turns a small outage into an indefinite one.
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

/** Verifies connectivity at boot so a bad .env fails loudly, not per request. */
async function connect() {
  const res = await pool.query('SELECT 1 AS ok');
  return res.rows[0].ok === 1;
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, connect, close };
const { Pool } = require('pg');
require('dotenv').config({ override: true });

/**
 * Postgres pool.
 *
 * `override: true` is deliberate so a stale shell variable cannot beat .env,
 * but the previous draft also fell back to USERNAME/PASSWORD -- generic OS
 * variables that on a shared host could silently become the database
 * password. Only the explicit DB_* names below are honoured now.
 *
 * SSL is required by the hosted provider (Neon) but has to be off for the plain
 * local Docker container, which serves no certificates.
 */
const isLocal = /^(localhost|127\.0\.0\.1|movielanche-pg|postgres)$/i.test(
  process.env.DB_HOST || ''
);

const poolConfig = process.env.DATABASE_URL
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
  ssl: process.env.DATABASE_URL || !isLocal ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
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

module.exports = { pool, query, connect };
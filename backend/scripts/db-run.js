#!/usr/bin/env node
/**
 * Safe runner for the SQL files.
 *
 * Two problems it solves:
 *
 *  1. `psql -f` ignores .env, so db:setup/db:seed silently connected using
 *     whatever PG* variables happened to be in the shell -- or failed on a
 *     fresh clone. This reads the same DB_* config the app uses.
 *
 *  2. seed.sql TRUNCATEs bookings. Run against the shared Neon database that
 *     erases every real booking, so this refuses when the target looks remote
 *     unless --force is passed explicitly.
 *
 * Usage:
 *   node scripts/db-run.js db/schema.sql
 *   node scripts/db-run.js db/seed.sql --force
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config();

const force = process.argv.includes('--force');
const file = process.argv.find((a) => a.endsWith('.sql'));
if (!file) {
  console.error('Usage: node scripts/db-run.js <file.sql> [--force]');
  process.exit(1);
}

const isDestructive = path.basename(file) === 'seed.sql';

const usingUrl = Boolean(process.env.DATABASE_URL);
const host = usingUrl
  ? (process.env.DATABASE_URL.match(/@([^:/?]+)/) || [])[1]
  : process.env.DB_HOST || 'localhost';

const REMOTE = /^(neon\.tech|.*\.neon\.tech|.*\.supabase\.(co|com)|.*\.rds\.amazonaws\.com|.*\.compute\.amazonaws\.com)$/i;

if (isDestructive) {
  if (!force && REMOTE.test(host || '')) {
    console.error(
      '\n  REFUSING TO RUN seed.sql against a shared host: ' + host + '\n' +
      '  This TRUNCATEs bookings, seats, shows, theatres and movies.\n' +
      '  If that is really what you want:\n\n' +
      '      npm run db:seed -- --force\n'
    );
    process.exit(1);
  }
  if (!force && host && !/^(localhost|127\.0\.0\.1|movielanche-pg|postgres)$/i.test(host)) {
    console.warn(
      '  WARNING: seeding a non-local host (' + host + '). Pass --force to confirm.'
    );
  }
}

const client = new Client(
  usingUrl
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'movielanche',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
      }
);

(async () => {
  try {
    await client.connect();
    const sql = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    // schema.sql is additive; only seed.sql needs the destructive opt-in.
    await client.query(isDestructive && force
      ? "SET movielanche.allow_destructive = 'yes';"
      : 'SELECT 1;');
    await client.query(sql);
    console.log('Applied ' + file + ' to ' + (host || 'localhost'));
    process.exit(0);
  } catch (err) {
    console.error('Failed: ' + err.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
/**
 * The cinema's timezone.
 *
 * Show times are stored as IST wall-clock (a TIME with no zone), so "is this
 * show still bookable?" is a question about the CINEMA's local clock, not the
 * database server's. Hosted Postgres almost always runs in UTC, which made the
 * cutoff up to 5h30m too lenient: at 21:14 IST (15:44 UTC) a 20:00 show had
 * "already started" as far as the query was concerned, and it was accepted.
 *
 * Every time comparison is done in SQL against this zone, never against
 * CURRENT_DATE / CURRENT_TIME, which silently inherit the server's zone.
 */

const DEFAULT_TZ = 'Asia/Kolkata';

/** Validates the configured zone once, so a typo fails at boot not mid-booking. */
function cinemaTimeZone() {
  const raw = (process.env.CINEMA_TZ || DEFAULT_TZ).trim();
  try {
    // Throws RangeError on an unknown zone.
    new Intl.DateTimeFormat('en-US', { timeZone: raw });
    return raw;
  } catch {
    console.warn(`CINEMA_TZ "${raw}" is not a valid IANA zone; falling back to ${DEFAULT_TZ}`);
    return DEFAULT_TZ;
  }
}

/**
 * SQL fragment comparing a show's (date, start_time) against now in the
 * cinema's zone.
 *
 * `s.date > today OR (s.date = today AND s.start_time > now)`
 * where both sides are the cinema's local calendar date and wall clock.
 * Callers pass the alias of the shows table.
 */
function showNotStartedSql(alias = 's') {
  const tz = cinemaTimeZone();
  return `(
    ${alias}.date > ((NOW() AT TIME ZONE '${tz}')::date)
    OR (
      ${alias}.date = ((NOW() AT TIME ZONE '${tz}')::date)
      AND ${alias}.start_time > ((NOW() AT TIME ZONE '${tz}')::time)
    )
  )`;
}

/** The cinema's local date as YYYY-MM-DD, for "today" defaults. */
async function cinemaToday(client) {
  const r = await (client || require('./db')).query(
    `SELECT to_char(NOW() AT TIME ZONE '${cinemaTimeZone()}', 'YYYY-MM-DD') AS today`
  );
  return r.rows[0].today;
}

module.exports = { cinemaTimeZone, showNotStartedSql, cinemaToday, DEFAULT_TZ };
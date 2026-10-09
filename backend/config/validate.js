/**
 * Shared request validation.
 *
 * Every helper is total: it never throws and never assumes a value's type.
 * Express parses `?a=1&a=2` into an ARRAY, and `?a[x]=1` into an OBJECT --
 * both arrive at handlers where a naive `.trim()` throws a TypeError outside the
 * route's try block, which Express then renders as an HTML stack trace.
 */

/** Postgres INTEGER range. Values outside it raise a 500, not a 404. */
const INT_MIN = 1;
const INT_MAX = 2147483647;

/**
 * Reads a query value as a trimmed string.
 * Arrays take their first element, objects/anything else return null.
 */
function qString(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : null;
  return null;
}

/**
 * Returns a path/query/body id as a string if it is a positive integer inside
 * the INT4 range, otherwise null.
 *
 * Accepts a real number as well as a string, because JSON request bodies carry
 * `{"showId": 39}` as a NUMBER while path params and query strings are always
 * strings. Accepting only strings silently rejected every numeric body id.
 *
 * The range check matters: '99999999999' satisfies /^\d+$/ but overflows
 * Postgres INTEGER and produces a 500 instead of a clean 404.
 */
function qId(value) {
  let raw;
  if (typeof value === 'string') raw = value.trim();
  else if (typeof value === 'number' && Number.isFinite(value)) raw = String(value);
  else if (Array.isArray(value)) raw = typeof value[0] === 'string' ? value[0].trim() : null;
  else return null;

  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < INT_MIN || n > INT_MAX) return null;
  return raw;
}

/**
 * Escapes LIKE wildcards so a user's '%' or '_' is searched literally instead
 * of matching everything. Applied to any value bound into a LIKE/ILIKE.
 */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => '\\' + c);
}

/** True for a plain object -- used to reject JSON bodies that are arrays/null. */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Enforces a max byte length on a string field (bcrypt's 72-byte limit). */
function withinBcryptLimit(value) {
  return Buffer.byteLength(value, 'utf8') <= 72;
}

module.exports = { qString, qId, escapeLike, isPlainObject, withinBcryptLimit, INT_MAX };
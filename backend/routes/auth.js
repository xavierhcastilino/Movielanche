const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../config/db');
const { isPlainObject, withinBcryptLimit, MAX_NAME_LENGTH } = require('../config/validate');

const router = express.Router();

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt silently truncates beyond 72 bytes
// A real bcrypt hash compared against when no user matches, so an unknown
// email costs the same wall-clock time as a known one and cannot be enumerated.
//
// It must be GENERATED, not hand-written. The previous hand-written constant was
// 61 characters with an invalid digest, so bcrypt.compare() bailed out before
// hashing: an unknown email answered in 0.7ms against 76ms for a known one --
// the exact enumeration signal the comparison was meant to remove.
const DUMMY_HASH = bcrypt.hashSync('movielanche-timing-equaliser', 10);

/** How long an already-rotated token may be replayed before it counts as theft. */
const REFRESH_REUSE_GRACE_SECONDS = 30;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), name: user.name, email: user.email, typ: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL_SECONDS, algorithm: 'HS256' }
  );
}

function publicUser(row) {
  return { id: String(row.id), name: row.name, email: row.email };
}

async function issueRefreshToken(userId, { userAgent = '', familyId = null } = {}) {
  const raw = crypto.randomBytes(48).toString('hex');
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent)
     VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval, $5)`,
    [userId, sha256(raw), familyId || crypto.randomUUID(), String(REFRESH_TTL_DAYS), userAgent.slice(0, 200)]
  );
  return { raw, familyId: familyId || null };
}

async function sessionPayload(user, req) {
  const accessToken = signAccessToken(user);
  const { raw } = await issueRefreshToken(user.id, { userAgent: req.get('user-agent') || '' });
  return {
    accessToken,
    refreshToken: raw,
    expiresIn: ACCESS_TTL_SECONDS,
    user: publicUser(user),
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const { name, email, password } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name is required' } });
  }
  // name is embedded in the access token, so an unbounded value produced a
  // ~7KB token and would eventually breach the 16KB HTTP header limit,
  // locking that account out of every request.
  if (name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `name must be at most ${MAX_NAME_LENGTH} characters` },
    });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'A valid email is required' } });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` },
    });
  }
  if (password.length > MAX_PASSWORD_LENGTH || !withinBcryptLimit(password)) {
    // bcrypt ignores bytes past 72, so a longer password would silently lose
    // its tail -- two different passwords could then authenticate the same.
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `password must be at most ${MAX_PASSWORD_LENGTH} bytes` },
    });
  }

  // Hash first, then take a connection. bcrypt blocks for ~76ms of pure CPU;
  // doing it while holding one of 10 pool slots made registration a cheap way
  // to starve every other request.
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await db.pool.connect();
  try {
    // The user row and its first refresh token are written together. Previously
    // a failure issuing the token left an account the client never received
    // credentials for, and the retry then failed with 409 EMAIL_TAKEN.
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), email.toLowerCase(), passwordHash]
    );

    const user = inserted.rows[0];
    const raw = crypto.randomBytes(48).toString('hex');
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval, $5)`,
      [user.id, sha256(raw), crypto.randomUUID(), String(REFRESH_TTL_DAYS),
       (req.get('user-agent') || '').slice(0, 200)]
    );

    await client.query('COMMIT');

    const accessToken = signAccessToken(user);
    return res.status(201).json({
      accessToken,
      refreshToken: raw,
      expiresIn: ACCESS_TTL_SECONDS,
      user: publicUser(user),
      token: accessToken,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // 23505 = unique_violation on the email index.
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email is already registered' } });
    }
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Registration failed' } });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const { email, password } = body;

  // Type checks first: previously email.toLowerCase()/bcrypt.compare() threw
  // on a JSON object or array, turning a client mistake into a 500.
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'email is required' } });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'password is required' } });
  }

  try {
    const found = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (found.rowCount === 0) {
      // Still pay the bcrypt cost, otherwise response time reveals which
      // emails are registered.
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const ok = await bcrypt.compare(password, found.rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const payload = await sessionPayload(found.rows[0], req);
    return res.json({ ...payload, token: payload.accessToken });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } });
  }
});

// POST /api/auth/refresh — rotating refresh token with reuse detection
router.post('/refresh', async (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const { refreshToken } = body;

  if (typeof refreshToken !== 'string' || !refreshToken) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'refreshToken is required' } });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const hash = sha256(refreshToken);

    // Claim the token atomically: the UPDATE only matches a row that is still
    // unrevoked and unexpired, so two concurrent refreshes with the same token
    // cannot both win. Previously the read-then-update was two separate
    // statements, which let both callers issue a successor and fork the family.
    const claimed = await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       RETURNING id, user_id, family_id`,
      [hash]
    );

    if (claimed.rowCount === 0) {
      // Either unknown, already rotated, or expired. Only a genuine REPLAY of
      // an already-rotated token revokes the family -- a token that simply
      // aged out is not evidence of theft, and treating it that way logged
      // honest users out whenever a refresh landed after the 7-day expiry.
      const existing = await client.query(
        `SELECT family_id, revoked_at FROM refresh_tokens WHERE token_hash = $1`,
        [hash]
      );

      if (existing.rowCount > 0 && existing.rows[0].revoked_at !== null) {
        // Grace window: a client whose response was lost retries with the token
        // it just spent, and two browser tabs refreshing at once race each
        // other. Neither is theft, and revoking the family on those punished
        // the legitimate holder -- it killed the NEW token too, so a single
        // dropped packet logged the user out. Only a replay that lands well
        // after rotation is treated as compromise.
        const revokedAt = new Date(existing.rows[0].revoked_at).getTime();
        const withinGrace = Date.now() - revokedAt < REFRESH_REUSE_GRACE_SECONDS * 1000;

        if (!withinGrace) {
          await client.query(
            `UPDATE refresh_tokens SET revoked_at = NOW()
             WHERE family_id = $1 AND revoked_at IS NULL`,
            [existing.rows[0].family_id]
          );
          await client.query('COMMIT');
          return res.status(401).json({
            error: { code: 'TOKEN_REUSE', message: 'Session revoked for safety. Please sign in again.' },
          });
        }

        // Inside the grace window: do NOT revoke the family. The successor the
        // client legitimately holds stays usable, so a dropped response costs
        // one re-login instead of killing a live session. (The successor's raw
        // token cannot be returned here -- only its hash is stored -- so the
        // client must sign in again; what matters is that the NEW token in the
        // client's possession is not collateral damage.)
        await client.query('ROLLBACK');
        return res.status(401).json({
          error: {
            code: 'TOKEN_REUSE_GRACE',
            message: 'This refresh token was already rotated. Sign in again to continue.',
          },
        });
      }

      await client.query('ROLLBACK');
      return res.status(401).json({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }

    const row = claimed.rows[0];

    const user = await client.query('SELECT id, name, email FROM users WHERE id = $1', [row.user_id]);
    if (user.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'User no longer exists' },
      });
    }

    const next = crypto.randomBytes(48).toString('hex');
    const nextHash = sha256(next);
    // replaced_by records the token's own hash, i.e. 'this row was spent and
    // superseded', which is what the grace-window lookup keys off. Storing the
    // PARENT's hash here (as this previously did) pointed the column at the
    // token that replaced us instead.
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, replaced_by)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval, $5, $6)`,
      [row.user_id, nextHash, row.family_id, String(REFRESH_TTL_DAYS),
       (req.get('user-agent') || '').slice(0, 200), nextHash]
    );

    await client.query('COMMIT');

    const accessToken = signAccessToken(user.rows[0]);
    return res.json({
      accessToken: accessToken,
      refreshToken: next,
      expiresIn: ACCESS_TTL_SECONDS,
      user: publicUser(user.rows[0]),
      token: accessToken,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Refresh failed' } });
  } finally {
    client.release();
  }
});

// POST /api/auth/logout — revoke just this session
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'refreshToken is required' } });
  }

  try {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
      [sha256(refreshToken)]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Logout failed' } });
  }
});

// POST /api/auth/logout-all — revoke every session for the caller
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('Logout-all error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Logout failed' } });
  }
});

/**
 * Bearer-token guard. Kept here so auth routes can reuse it for logout-all.
 *
 * Also confirms the account still exists: a JWT stays cryptographically valid
 * for its full TTL even after the user is deleted, so without this check a
 * removed user keeps full access until the token ages out.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.trim().split(/\s+/);

  // RFC 7235: the auth scheme is case-insensitive, so 'bearer x' is valid.
  if (!token || !scheme || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
    });
  }

  let payload;
  try {
    // algorithms pinned: without this, a token could select a different family
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
    });
  }

  if (payload.typ !== 'access') {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Wrong token type' },
    });
  }

  try {
    const user = await db.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
    if (user.rowCount === 0) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Account no longer exists' },
      });
    }
  } catch (err) {
    console.error('Auth lookup error:', err.message);
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Please retry shortly' },
    });
  }

  req.user = { id: String(payload.sub), name: payload.name, email: payload.email };
  return next();
}

module.exports = router;
module.exports.requireAuth = requireAuth;
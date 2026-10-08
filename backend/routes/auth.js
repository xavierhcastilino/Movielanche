const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../config/db');

const router = express.Router();

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), name: user.name, email: user.email, typ: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL_SECONDS }
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
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name is required' } });
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'A valid email is required' } });
  }
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` },
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), email.toLowerCase(), passwordHash]
    );

    const user = inserted.rows[0];
    const payload = await sessionPayload(user, req);
    return res.status(201).json({ ...payload, token: payload.accessToken });
  } catch (err) {
    // 23505 = unique_violation on the email index.
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email is already registered' } });
    }
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Registration failed' } });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'email and password are required' } });
  }

  try {
    const found = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (found.rowCount === 0 || !(await bcrypt.compare(password, found.rows[0].password_hash))) {
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
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'refreshToken is required' } });
  }

  try {
    const found = await db.query(
      `SELECT id, user_id, family_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1`,
      [sha256(refreshToken)]
    );

    if (found.rowCount === 0) {
      return res.status(401).json({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }

    const row = found.rows[0];
    const active = row.revoked_at === null && new Date(row.expires_at).getTime() > Date.now();

    if (!active) {
      // Replaying a rotated token is a theft signal: revoke the whole family.
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE family_id = $1 AND revoked_at IS NULL`,
        [row.family_id]
      );
      return res.status(401).json({
        error: { code: 'TOKEN_REUSE', message: 'Session revoked for safety. Please sign in again.' },
      });
    }

    const user = await db.query('SELECT id, name, email FROM users WHERE id = $1', [row.user_id]);
    if (user.rowCount === 0) {
      return res.status(401).json({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'User no longer exists' },
      });
    }

    const next = await issueRefreshToken(row.user_id, {
      userAgent: req.get('user-agent') || '',
      familyId: row.family_id,
    });

    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $1 WHERE id = $2`,
      [sha256(next.raw), row.id]
    );

    const accessToken = signAccessToken(user.rows[0]);
    return res.json({
      accessToken,
      refreshToken: next.raw,
      expiresIn: ACCESS_TTL_SECONDS,
      user: publicUser(user.rows[0]),
    });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Refresh failed' } });
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

/** Bearer-token guard. Kept here so auth routes can reuse it for logout-all. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: String(payload.sub), name: payload.name, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
    });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
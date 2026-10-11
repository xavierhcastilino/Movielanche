const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');

const router = express.Router();

const ACCESS_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const JWT_SECRET = process.env.JWT_SECRET || 'movielanche_default_secret_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function signAccessToken(user) {
  const userId = user.user_id || user.id;
  const email = user.email_id || user.email;
  return jwt.sign(
    { sub: String(userId), name: user.name, email: email, typ: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL_SECONDS }
  );
}

function publicUser(row) {
  const userId = row.user_id || row.id;
  const userEmail = row.email_id || row.email;
  return {
    id: String(userId),
    user_id: userId,
    name: row.name,
    email: userEmail,
    email_id: userEmail,
    text: row.text || '',
    created_at: row.created_at
  };
}

/** Bearer token authentication middleware */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.trim().split(/\s+/);

  if (!token || !scheme || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: String(payload.sub), name: payload.name, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
    });
  }
}

// GET /api/auth/config — Expose public auth configuration to frontend
router.get('/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const isPlaceholder = !clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.includes('<');
  return res.json({
    success: true,
    clientId: isPlaceholder ? '' : clientId,
    rawClientId: clientId,
    isConfigured: !isPlaceholder
  });
});

// GET /api/auth/demo-users — helper to get tokens for Alice and Bob for easy frontend testing
router.get('/demo-users', async (req, res) => {
  try {
    const usersRes = await db.query(
      `SELECT user_id, name, email_id, email FROM users ORDER BY user_id ASC LIMIT 3`
    );
    const demoUsers = usersRes.rows.map((u) => {
      const userObj = { user_id: u.user_id, name: u.name, email: u.email };
      const token = signAccessToken(userObj);
      return {
        id: String(u.user_id),
        name: u.name,
        email: u.email,
        token: token
      };
    });
    return res.json({ success: true, data: demoUsers });
  } catch (err) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/auth/google — Verify Google ID Token & login or register user
router.post('/google', async (req, res) => {
  const { credential, idToken, token } = req.body || {};
  const rawToken = credential || idToken || token;

  if (!rawToken || typeof rawToken !== 'string') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Google credential / ID token is required' }
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const isPlaceholder = !clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.includes('<');

  try {
    let payload;
    try {
      const verifyOptions = { idToken: rawToken };
      if (!isPlaceholder && clientId) {
        verifyOptions.audience = clientId;
      }
      const ticket = await googleClient.verifyIdToken(verifyOptions);
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `Google token verification failed: ${verifyErr.message}`
        }
      });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Google token does not contain a verified email address' }
      });
    }

    const email = payload.email.toLowerCase().trim();
    const name = (payload.name || payload.given_name || email.split('@')[0] || 'Google User').trim();
    const picture = payload.picture || '';

    // Check if user already exists in Neon DB
    const existing = await db.query(
      'SELECT user_id, name, email_id, email, text, created_at FROM users WHERE LOWER(email_id) = $1 OR LOWER(email) = $1',
      [email]
    );

    let user;
    if (existing.rowCount > 0) {
      user = existing.rows[0];
      if (!user.name && name) {
        await db.query('UPDATE users SET name = $1 WHERE user_id = $2', [name, user.user_id]);
        user.name = name;
      }
    } else {
      // Create new user in DB
      // password_hash has NOT NULL constraint in schema, store secure random token placeholder
      const passwordHash = `google_oauth:${crypto.randomBytes(16).toString('hex')}`;
      const insertRes = await db.query(
        `INSERT INTO users (name, email_id, email, password_hash, text)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id, name, email_id, email, text, created_at`,
        [name, email, email, passwordHash, picture ? `google_auth:${picture}` : 'google_auth']
      );
      user = insertRes.rows[0];
    }

    const accessToken = signAccessToken(user);
    const userPayload = publicUser(user);
    if (picture) {
      userPayload.picture = picture;
    }

    return res.json({
      success: true,
      token: accessToken,
      accessToken,
      user: userPayload
    });
  } catch (err) {
    console.error('Google auth processing error:', err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Google authentication failed' }
    });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const found = await db.query(
      'SELECT user_id, name, email_id, email, text, created_at FROM users WHERE user_id = $1',
      [req.user.id]
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return res.json({
      success: true,
      user: publicUser(found.rows[0]),
    });
  } catch (err) {
    console.error('Fetch me error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' } });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
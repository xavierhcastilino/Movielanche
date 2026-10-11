const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { resetUrlForToken, sendPasswordResetEmail } = require('../config/mailer');
const { isPlainObject, withinBcryptLimit, MAX_NAME_LENGTH } = require('../config/validate');

const router = express.Router();

const ACCESS_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const JWT_SECRET = process.env.JWT_SECRET || 'movielanche_default_secret_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const DUMMY_HASH = bcrypt.hashSync('movielanche-timing-equaliser', 10);

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

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, email_id, password, text } = req.body || {};
  const targetEmail = (email || email_id || '').trim();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Name is required' } });
  }
  if (!targetEmail || !EMAIL_RE.test(targetEmail)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'A valid email is required' } });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.query(
      `INSERT INTO users (name, email_id, email, password_hash, text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email_id, email, text, created_at`,
      [name.trim(), targetEmail.toLowerCase(), targetEmail.toLowerCase(), passwordHash, text || '']
    );

    const user = inserted.rows[0];
    const userPayload = publicUser(user);
    const token = signAccessToken(user);

    return res.status(201).json({
      success: true,
      token,
      accessToken: token,
      user: userPayload,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email is already registered' } });
    }
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Registration failed' } });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, email_id, password } = req.body || {};
  const targetEmail = (email || email_id || '').trim();

  if (!targetEmail || !password) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Email and password are required' } });
  }

  try {
    const found = await db.query(
      'SELECT user_id, name, email_id, email, text, password_hash FROM users WHERE email_id = $1 OR email = $1',
      [targetEmail.toLowerCase()]
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

    const user = found.rows[0];
    const userPayload = publicUser(user);
    const token = signAccessToken(user);

    return res.json({
      success: true,
      token,
      accessToken: token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } });
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
      // Create new user in Neon DB
      // password_hash has NOT NULL constraint in schema, generate secure random hash
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 10);
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


// POST /api/auth/forgot-password - request a reset link by email.
// Always returns 200 so the response never reveals whether an email is registered.
router.post('/forgot-password', async (req, res) => {
  const done = { success: true, message: 'If that email is registered, a reset link is on its way.' };
  const body = req.body || {};
  const targetEmail = ((body.email || body.email_id) || '').trim().toLowerCase();
  if (!targetEmail || !EMAIL_RE.test(targetEmail)) return res.json(done);
  try {
    const found = await db.query(
      'SELECT user_id FROM users WHERE email_id = $1 OR email = $1',
      [targetEmail]
    );
    if (found.rowCount === 0) {
      await bcrypt.compare('movielanche-timing-equaliser', DUMMY_HASH);
      return res.json(done);
    }
    const userId = found.rows[0].user_id;
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'20 minutes\')',
      [userId, hash]
    );
    await sendPasswordResetEmail(targetEmail, resetUrlForToken(req, raw));
    return res.json(done);
  } catch (err) {
    console.error('Forgot-password error:', err.message);
    return res.json(done);
  }
});

// POST /api/auth/reset-password - set a new password with a valid reset token.
router.post('/reset-password', async (req, res) => {
  const body = req.body || {};
  if (!body.token || typeof body.token !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Reset token is required' } });
  }
  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters' },
    });
  }
  try {
    const hash = crypto.createHash('sha256').update(body.token).digest('hex');
    const found = await db.query(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()',
      [hash]
    );
    if (found.rowCount === 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Reset link is invalid or has expired' } });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, found.rows[0].user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [found.rows[0].id]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [found.rows[0].user_id]);
    return res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('Reset-password error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Password reset failed' } });
  }
});
module.exports = router;
module.exports.requireAuth = requireAuth;
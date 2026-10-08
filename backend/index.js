require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const moviesRouter = require('./routes/movies');
const showsRouter = require('./routes/shows');
const authRouter = require('./routes/auth');
const bookingsRouter = require('./routes/bookings');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    await db.connect();
    return res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', database: err.message });
  }
});

// API routes
app.use('/api/movies', moviesRouter);
app.use('/api/shows', showsRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);

// Unknown /api paths must return JSON, never the SPA shell -- otherwise a
// frontend parsing a 404 body gets HTML and fails with a confusing error.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// SPA fallback for everything else.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify the database at boot so a bad .env fails immediately and loudly
// instead of on the first request.
async function main() {
  await db.connect();
  console.log('Connected to PostgreSQL');
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
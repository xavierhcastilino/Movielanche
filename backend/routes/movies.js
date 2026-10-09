const express = require('express');
const db = require('../config/db');
const { qString, qId, escapeLike } = require('../config/validate');

const router = express.Router();

/**
 * Serialise a Postgres movie row into the shape the frontend consumes.
 *
 * Field aliases are deliberate: public/app.js reads snake_case
 * (poster_url, release_year) while the rest of our API is camelCase, so both
 * spellings are emitted rather than forcing the frontend to change mid-sprint.
 */
function toCard(row) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    genres: row.genres || [],
    genre: (row.genres || [])[0] || null,
    language: row.language,
    durationMin: row.duration_min,
    posterUrl: row.poster_url,
    poster_url: row.poster_url,
    rating: row.rating === null ? null : Number(row.rating),
    releaseYear: row.release_year,
    release_year: row.release_year,
    status: row.status,
  };
}

/**
 * Postgres DATE columns arrive as raw 'YYYY-MM-DD' strings (config/db.js
 * overrides the type parser) so no timezone conversion can shift them.
 */
function toDateString(value) {
  return value == null ? null : String(value).slice(0, 10);
}

/** TIME columns arrive as 'HH:mm:ss'. */
function toTimeString(value) {
  return String(value).slice(0, 5);
}

/** Clamped pagination; returns null when the caller sent something invalid. */
function parsePaging(query) {
  const limitRaw = qString(query.limit);
  const offsetRaw = qString(query.offset);
  const limit = limitRaw === null ? 50 : Number(limitRaw);
  const offset = offsetRaw === null ? 0 : Number(offsetRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  if (!Number.isInteger(offset) || offset < 0) return null;
  return { limit, offset };
}

/**
 * GET /api/movies?search=&genre=&language=&filter=now_showing|coming_soon&limit=&offset=
 *
 * Every parameter is optional and they combine with AND. `genre` matches any
 * element of the genres array, which is what a single-select filter needs.
 */
router.get('/', async (req, res) => {
  const search = qString(req.query.search);
  const genre = qString(req.query.genre);
  const language = qString(req.query.language);
  const filter = qString(req.query.filter);

  if (filter && filter !== 'now_showing' && filter !== 'coming_soon') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: "filter must be 'now_showing' or 'coming_soon'" },
    });
  }

  const paging = parsePaging(req.query);
  if (!paging) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'limit must be 1-100 and offset must be >= 0' },
    });
  }

  const where = [];
  const params = [];

  if (search) {
    // Wildcards are escaped so a literal '%' searches for '%'.
    params.push(`%${escapeLike(search)}%`);
    where.push(`title ILIKE $${params.length} ESCAPE '\\'`);
  }
  if (genre) {
    params.push(genre);
    where.push(`$${params.length} = ANY(genres)`);
  }
  if (language) {
    params.push(language);
    where.push(`language = $${params.length}`);
  }
  if (filter) {
    params.push(filter);
    where.push(`status = $${params.length}`);
  }

  // Pushed BEFORE the SQL is built so the placeholder indices line up.
  params.push(paging.limit, paging.offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT id, title, description, genres, language, duration_min,
           poster_url, rating, release_year, status
    FROM movies
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY title
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  try {
    const result = await db.query(sql, params);
    // public/app.js reads `data.success` / `data.data`, so the envelope is part
    // of the contract with the committed frontend.
    return res.json({
      success: true,
      count: result.rowCount,
      limit: paging.limit,
      offset: paging.offset,
      data: result.rows.map(toCard),
    });
  } catch (err) {
    console.error('Error fetching movies:', err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch movies' },
    });
  }
});

/**
 * GET /api/movies/near?location=&date=YYYY-MM-DD
 *
 * Backs the "location" step of the discovery flow. Location matching is a
 * case-insensitive substring so a search box can send a partial value, and an
 * unknown location returns an empty list rather than a 404.
 */
router.get('/near', async (req, res) => {
  const location = qString(req.query.location);
  const date = qString(req.query.date);

  if (!location) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'location is required' } });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'date=YYYY-MM-DD is required' },
    });
  }

  try {
    const result = await db.query(
      `SELECT t.id AS theatre_id, t.name, t.location,
              s.id AS show_id, s.start_time, s.screen, s.price,
              (SELECT COUNT(*) FROM seats st
                WHERE st.show_id = s.id AND st.status = 'available') AS seats_available,
              m.id AS movie_id, m.title, m.language, m.duration_min,
              m.poster_url, m.status AS movie_status
       FROM shows s
       JOIN theatres t ON t.id = s.theatre_id
       JOIN movies m ON m.id = s.movie_id
       WHERE t.location ILIKE $1 ESCAPE '\\' AND s.date = $2
       ORDER BY t.name, s.start_time`,
      [`%${escapeLike(location)}%`, date]
    );

    const theatres = new Map();
    for (const row of result.rows) {
      const tid = String(row.theatre_id);
      if (!theatres.has(tid)) {
        theatres.set(tid, { theatreId: tid, name: row.name, location: row.location, shows: [] });
      }
      theatres.get(tid).shows.push({
        showId: String(row.show_id),
        startTime: toTimeString(row.start_time),
        screen: row.screen,
        price: Number(row.price),
        seatsAvailable: Number(row.seats_available),
        movie: {
          id: String(row.movie_id),
          title: row.title,
          language: row.language,
          durationMin: row.duration_min,
          posterUrl: row.poster_url,
          status: row.movie_status,
        },
      });
    }

    return res.json({ location, date, theatres: [...theatres.values()] });
  } catch (err) {
    console.error('Error fetching nearby shows:', err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch shows for location' },
    });
  }
});

/** GET /api/movies/:id/shows?date=YYYY-MM-DD — shows grouped by theatre */
router.get('/:id/shows', async (req, res) => {
  const id = qId(req.params.id);
  const date = qString(req.query.date);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'date=YYYY-MM-DD is required' },
    });
  }

  try {
    const exists = await db.query('SELECT 1 FROM movies WHERE id = $1', [id]);
    if (exists.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
    }

    const result = await db.query(
      `SELECT t.id AS theatre_id, t.name, t.location,
              s.id AS show_id, s.start_time, s.screen, s.price,
              (SELECT COUNT(*) FROM seats st
                WHERE st.show_id = s.id AND st.status = 'available') AS seats_available
       FROM shows s
       JOIN theatres t ON t.id = s.theatre_id
       WHERE s.movie_id = $1 AND s.date = $2
       ORDER BY t.name, s.start_time`,
      [id, date]
    );

    const theatres = new Map();
    for (const row of result.rows) {
      const tid = String(row.theatre_id);
      if (!theatres.has(tid)) {
        theatres.set(tid, { theatreId: tid, name: row.name, location: row.location, shows: [] });
      }
      theatres.get(tid).shows.push({
        showId: String(row.show_id),
        startTime: toTimeString(row.start_time),
        screen: row.screen,
        price: Number(row.price),
        seatsAvailable: Number(row.seats_available),
      });
    }

    return res.json({ movieId: String(id), date, theatres: [...theatres.values()] });
  } catch (err) {
    console.error(`Error fetching shows for movie ${id}:`, err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch shows' } });
  }
});

/** GET /api/movies/:id — detail view, including the dates that have shows */
router.get('/:id', async (req, res) => {
  const id = qId(req.params.id);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
  }

  try {
    const movie = await db.query(
      `SELECT id, title, description, genres, language, duration_min,
              poster_url, rating, release_year, status
       FROM movies WHERE id = $1`,
      [id]
    );

    if (movie.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
    }

    // Distinct upcoming show dates power the date picker.
    const dates = await db.query(
      `SELECT DISTINCT date
       FROM shows
       WHERE movie_id = $1 AND date >= CURRENT_DATE
       ORDER BY date`,
      [id]
    );

    return res.json({
      ...toCard(movie.rows[0]),
      showDates: dates.rows.map((r) => toDateString(r.date)),
    });
  } catch (err) {
    console.error(`Error fetching movie ${id}:`, err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch movie details' },
    });
  }
});

module.exports = router;
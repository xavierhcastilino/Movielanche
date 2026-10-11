const express = require('express');
const db = require('../config/db');
const { qString, qId, escapeLike, isValidDate } = require('../config/validate');
const { showNotStartedSql, cinemaTimeZone } = require('../config/timezone');

const router = express.Router();

/**
 * Format a movie row from movie_details into standard object
 */
function toCard(row) {
  const movieId = row.movie_id || row.id;
  const title = row.movie_title || row.title || `Movie #${movieId}`;
  const relDate = row.release_date ? (row.release_date instanceof Date ? row.release_date.toISOString().slice(0, 10) : String(row.release_date).slice(0, 10)) : null;
  const relYear = relDate ? parseInt(relDate.slice(0, 4), 10) : (row.release_year || null);
  const poster = row.image_url || row.poster_url || row.poster || '/poster-placeholder.svg';

  return {
    id: String(movieId),
    movie_id: movieId,
    title: title,
    movie_title: title,
    name: title,
    description: row.description || '',
    release_date: relDate,
    release_year: relYear,
    releaseYear: relYear,
    year: relYear,
    rating: row.rating || null,
    genre: row.genre || (Array.isArray(row.genres) ? row.genres[0] : ''),
    genres: Array.isArray(row.genres) ? row.genres : (row.genre ? [row.genre] : []),
    director: row.director || '',
    IMDB_score: row.IMDB_score !== null && row.IMDB_score !== undefined ? Number(row.IMDB_score) : null,
    imdb_score: row.IMDB_score !== null && row.IMDB_score !== undefined ? Number(row.IMDB_score) : null,
    score: row.IMDB_score !== null && row.IMDB_score !== undefined ? Number(row.IMDB_score) : null,
    image_url: poster,
    poster_url: poster,
    posterUrl: poster,
    poster: poster,
    image: poster
  };
}

/**
 * GET /api/movies
 * Optional query params: search, genre
 */
router.get('/', async (req, res) => {
  const { search, genre } = req.query;

  const where = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(movie_title ILIKE $${params.length} OR description ILIKE $${params.length} OR director ILIKE $${params.length})`);
  }
  if (genre && genre.trim()) {
    params.push(`%${genre.trim()}%`);
    where.push(`genre ILIKE $${params.length}`);
  }

  // Pushed BEFORE the SQL is built so the placeholder indices line up.
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT *
    FROM movie_details
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY movie_id ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  try {
    const result = await db.query(sql, params);
    return res.json({
      success: true,
      count: result.rowCount,
      data: result.rows.map(toCard)
    });
  } catch (err) {
    console.error('Error fetching movies:', err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch movies' },
    });
  }
});

/**
 * GET /api/movies/:id
 */
router.get('/:id', async (req, res) => {
  const id = qId(req.params.id);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
  }

  try {
    const result = await db.query(
      `SELECT * FROM movie_details WHERE movie_id = $1 OR id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } });
    }

    const movieCard = toCard(result.rows[0]);

    // Fetch showings if showings table exists
    const showings = await db.query(
      `SELECT s.*, t.name as theatre_name
       FROM showings s
       LEFT JOIN theatre_details t ON t.id = s.theatre_id
       WHERE s.movie_id = $1`,
      [id]
    ).catch(() => ({ rows: [] }));

    return res.json({
      success: true,
      data: {
        ...movieCard,
        showings: showings.rows || []
      }
    });
  } catch (err) {
    console.error(`Error fetching movie ${id}:`, err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch movie details' },
    });
  }
});

module.exports = router;
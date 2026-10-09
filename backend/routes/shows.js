const express = require('express');
const db = require('../config/db');
const { qId } = require('../config/validate');
const { showNotStartedSql, cinemaTimeZone } = require('../config/timezone');

const router = express.Router();

/** GET /api/shows/:id/seats — flat seat grid for the frontend */
router.get('/:id/seats', async (req, res) => {
  const id = qId(req.params.id);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
  }

  try {
    // Include show metadata: a seat grid on its own can't tell the client which
    // movie, screen or time it belongs to, so the frontend had to make a second
    // request to render a header.
    const show = await db.query(
      `SELECT s.id, s.price, s.date, s.start_time, s.screen,
              m.title, m.language, t.name AS theatre, t.location,
              ${showNotStartedSql('s')} AS bookable
       FROM shows s
       JOIN movies m ON m.id = s.movie_id
       JOIN theatres t ON t.id = s.theatre_id
       WHERE s.id = $1`,
      [id]
    );

    if (show.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
    }

    // ORDER BY seat_number sorts as TEXT: 'A10' lands before 'A2'. Sort by row
    // then numeric index so the grid is correct at 10+ seats per row.
    const seats = await db.query(
      `SELECT seat_number, status
       FROM seats
       WHERE show_id = $1
       ORDER BY LEFT(seat_number, 1),
                NULLIF(SUBSTRING(seat_number FROM 2), '')::int,
                seat_number`,
      [id]
    );

    const row = show.rows[0];
    return res.json({
      showId: String(row.id),
      movie: { title: row.title, language: row.language },
      theatre: { name: row.theatre, location: row.location },
      date: row.date == null ? null : String(row.date).slice(0, 10),
      startTime: row.start_time == null ? null : String(row.start_time).slice(0, 5),
      screen: row.screen,
      timezone: cinemaTimeZone(),
      // false once the show has started, so a client can grey the grid out
      // instead of letting the user fill a basket for an unbookable show.
      bookable: row.bookable === true,
      price: Number(row.price),
      seats: seats.rows.map((s) => ({ seatNumber: s.seat_number, status: s.status })),
    });
  } catch (err) {
    console.error(`Error fetching seats for show ${id}:`, err.message);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch seats' },
    });
  }
});

module.exports = router;
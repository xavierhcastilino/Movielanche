const express = require('express');
const db = require('../config/db');
const { qId } = require('../config/validate');

const router = express.Router();

/** GET /api/shows/:id/seats — flat seat grid for the frontend */
router.get('/:id/seats', async (req, res) => {
  const id = qId(req.params.id);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
  }

  try {
    const show = await db.query(
      'SELECT id, price FROM shows WHERE id = $1',
      [id]
    );

    if (show.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
    }

    const seats = await db.query(
      `SELECT seat_number, status
       FROM seats
       WHERE show_id = $1
       ORDER BY seat_number`,
      [id]
    );

    return res.json({
      showId: String(show.rows[0].id),
      price: Number(show.rows[0].price),
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
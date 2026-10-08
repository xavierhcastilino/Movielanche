const crypto = require('crypto');
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('./auth');

const router = express.Router();

const MAX_SEATS = 6;
const SEAT_RE = /^[A-E][1-8]$/;

/** Unambiguous alphabet (no 0/O, 1/I/L) — codes get read aloud at the counter. */
function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(5);
  let code = '';
  for (const b of bytes) code += chars[b % chars.length];
  return `BMS-${code}`;
}

/** Builds the ticket payload shared by create / get / list. */
async function buildBookingPayload(row) {
  const joined = await db.query(
    `SELECT m.title, t.name AS theatre, s.date, s.start_time, s.price
     FROM shows s
     JOIN movies m ON m.id = s.movie_id
     JOIN theatres t ON t.id = s.theatre_id
     WHERE s.id = $1`,
    [row.show_id]
  );

  const show = joined.rows[0];
  const created = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : String(row.created_at);

  return {
    bookingId: String(row.id),
    bookingCode: row.booking_code,
    movie: show ? show.title : null,
    theatre: show ? show.theatre : null,
    date: show && show.date instanceof Date ? show.date.toISOString().slice(0, 10) : null,
    startTime: show ? String(show.start_time).slice(0, 5) : null,
    seats: row.seats || [],
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: created,
  };
}

/**
 * POST /api/bookings (protected)
 *
 * The seat lock runs in one transaction:
 *   1. SELECT ... FOR UPDATE pins the requested seat rows in a stable order,
 *      so two concurrent requests queue instead of interleaving.
 *   2. If any seat is already booked, nothing is written and we return 409.
 *   3. Otherwise flip the seats, insert the booking and its seat rows, commit.
 *
 * Rolling back on any error means a failed booking can never leave a seat
 * half-claimed, and it can only ever release seats taken by THIS request --
 * filtering on booked_by would also release the caller's earlier bookings.
 */
router.post('/', requireAuth, async (req, res) => {
  const { showId, seats } = req.body || {};

  if (!showId || !/^\d+$/.test(String(showId))) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'A valid showId is required' } });
  }
  if (!Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'seats must be a non-empty array of seat numbers' },
    });
  }
  if (seats.length > MAX_SEATS) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `You can book at most ${MAX_SEATS} seats per booking` },
    });
  }
  if (!seats.every((s) => typeof s === 'string' && SEAT_RE.test(s))) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Seat numbers must look like A1..E8' } });
  }
  if (new Set(seats).size !== seats.length) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Duplicate seat numbers in request' } });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const show = await client.query('SELECT id, price FROM shows WHERE id = $1', [showId]);
    if (show.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
    }

    // ORDER BY keeps the lock order identical across concurrent requests,
    // which is what prevents deadlock.
    const locked = await client.query(
      `SELECT seat_number, status
       FROM seats
       WHERE show_id = $1 AND seat_number = ANY($2::text[])
       ORDER BY seat_number
       FOR UPDATE`,
      [showId, seats]
    );

    if (locked.rowCount !== seats.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'One or more seats do not exist for this show' } });
    }

    const taken = locked.rows.filter((r) => r.status === 'booked').map((r) => r.seat_number);
    if (taken.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: { code: 'SEAT_UNAVAILABLE', message: 'One or more seats are already booked' },
      });
    }

    await client.query(
      `UPDATE seats SET status = 'booked', booked_by = $1
       WHERE show_id = $2 AND seat_number = ANY($3::text[])`,
      [req.user.id, showId, seats]
    );

    const price = Number(show.rows[0].price);
    const booking = await client.query(
      `INSERT INTO bookings (user_id, show_id, booking_code, seats, total_amount)
       VALUES ($1, $2, $3, $4::text[], $5)
       RETURNING id, booking_code, seats, total_amount, status, created_at`,
      [req.user.id, showId, generateBookingCode(), seats, price * seats.length]
    );

    // Normalised rows carry the database-level "one booking per seat" guarantee.
    for (const seat of seats) {
      await client.query(
        `INSERT INTO booking_seats (booking_id, show_id, seat_number) VALUES ($1, $2, $3)`,
        [booking.rows[0].id, showId, seat]
      );
    }

    await client.query('COMMIT');

    const payload = await buildBookingPayload({ ...booking.rows[0], show_id: showId });
    return res.status(201).json(payload);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // 23505 = the booking_seats primary key already claimed this seat.
    if (err.code === '23505') {
      return res.status(409).json({
        error: { code: 'SEAT_UNAVAILABLE', message: 'One or more seats are already booked' },
      });
    }
    console.error('Booking error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Booking failed' } });
  } finally {
    client.release();
  }
});

/**
 * GET /api/bookings/me (protected) — newest first
 *
 * MUST stay above '/:id': Express matches in registration order, so a later
 * '/:id' would swallow the literal "me" and every user would get a 404.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const found = await db.query(
      `SELECT id, show_id, booking_code, seats, total_amount, status, created_at
       FROM bookings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const payloads = [];
    for (const row of found.rows) {
      payloads.push(await buildBookingPayload(row));
    }
    return res.json(payloads);
  } catch (err) {
    console.error('My bookings error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } });
  }
});

/** GET /api/bookings/:id (protected) — 404 unless it belongs to the caller */
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
  }

  try {
    const found = await db.query(
      `SELECT id, show_id, booking_code, seats, total_amount, status, created_at
       FROM bookings
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    }

    return res.json(await buildBookingPayload(found.rows[0]));
  } catch (err) {
    console.error('Get booking error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch booking' } });
  }
});

module.exports = router;
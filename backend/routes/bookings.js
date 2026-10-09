const crypto = require('crypto');
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('./auth');
const { qId, qString } = require('../config/validate');

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

/**
 * Serialises a booking row that ALREADY carries the joined movie/theatre/show
 * columns. Kept separate from buildBookingPayload so list endpoints can resolve
 * everything in one query instead of one per row.
 *
 * created_at is TIMESTAMPTZ (a real instant -> ISO string); show.date is a DATE,
 * already a 'YYYY-MM-DD' string thanks to the type parser override.
 */
function toBookingPayload(row) {
  return {
    bookingId: String(row.id),
    bookingCode: row.booking_code,
    movie: row.title ?? null,
    theatre: row.theatre ?? null,
    date: row.date == null ? null : String(row.date).slice(0, 10),
    startTime: row.start_time == null ? null : String(row.start_time).slice(0, 5),
    seats: row.seats || [],
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

/** Builds the ticket payload for a booking row that has no joined columns. */
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
    date: show ? String(show.date).slice(0, 10) : null,
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
  const validShowId = qId(showId);

  if (validShowId === null) {
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
  let committed = null;
  try {
    await client.query('BEGIN');

    const show = await client.query(
      `SELECT id, price, date, start_time
       FROM shows
       WHERE id = $1
         AND (date > CURRENT_DATE OR (date = CURRENT_DATE AND start_time > CURRENT_TIME))`,
      [validShowId]
    );
    if (show.rowCount === 0) {
      // Either the show does not exist, or it has already started. Both are
      // "nothing to book here" and must not leak which one it was.
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'SHOW_UNAVAILABLE', message: 'This show is not available for booking' },
      });
    }

    // ORDER BY keeps the lock order identical across concurrent requests,
    // which is what prevents deadlock.
    const locked = await client.query(
      `SELECT seat_number, status
       FROM seats
       WHERE show_id = $1 AND seat_number = ANY($2::text[])
       ORDER BY seat_number
       FOR UPDATE`,
      [validShowId, seats]
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
      [req.user.id, validShowId, seats]
    );

    const price = Number(show.rows[0].price);
    const total = price * seats.length;

    // booking_code is unique but drawn from a 32-char alphabet, so collisions
    // are only rare -- not impossible (~50% by the birthday bound around 6k
    // bookings). Retry with a fresh code instead of blaming the caller's seats.
    let booking;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        booking = await client.query(
          `INSERT INTO bookings (user_id, show_id, booking_code, seats, total_amount)
           VALUES ($1, $2, $3, $4::text[], $5)
           RETURNING id, booking_code, seats, total_amount, status, created_at`,
          [req.user.id, validShowId, generateBookingCode(), seats, total]
        );
        break;
      } catch (err) {
        if (err.code === '23505' && /booking_code/.test(err.constraint || '')) continue;
        throw err;
      }
    }
    if (!booking) {
      await client.query('ROLLBACK');
      return res.status(503).json({
        error: { code: 'CODE_EXHAUSTED', message: 'Could not allocate a booking code, please retry' },
      });
    }

    // Normalised rows carry the database-level "one booking per seat" guarantee.
    for (const seat of seats) {
      await client.query(
        `INSERT INTO booking_seats (booking_id, show_id, seat_number) VALUES ($1, $2, $3)`,
        [booking.rows[0].id, validShowId, seat]
      );
    }

    await client.query('COMMIT');
    committed = booking.rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // 23505 on booking_seats means the seat PK already claimed this seat.
    // Any other unique violation is NOT a seat conflict and must not be
    // reported as one.
    if (err.code === '23505' && /booking_seats/.test(err.constraint || '')) {
      return res.status(409).json({
        error: { code: 'SEAT_UNAVAILABLE', message: 'One or more seats are already booked' },
      });
    }
    // 23503 = the JWT belongs to a user that no longer exists.
    if (err.code === '23503') {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Account no longer exists' },
      });
    }
    console.error('Booking error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Booking failed' } });
  } finally {
    client.release();
  }

  // Past this point the transaction is committed and the client owns a real
  // booking. A failure assembling the response must NOT be reported as a
  // failed booking, or the user retries and is told their own seats are taken.
  try {
    const payload = await buildBookingPayload({ ...committed, show_id: validShowId });
    return res.status(201).json(payload);
  } catch (err) {
    console.error('Booking committed but response build failed:', err.message);
    return res.status(201).json({
      bookingId: String(committed.id),
      bookingCode: committed.booking_code,
      seats: committed.seats,
      totalAmount: Number(committed.total_amount),
      status: committed.status,
      createdAt: committed.created_at,
    });
  }
});

/**
 * GET /api/bookings/me (protected) — newest first
 *
 * MUST stay above '/:id': Express matches in registration order, so a later
 * '/:id' would swallow the literal "me" and every user would get a 404.
 */
router.get('/me', requireAuth, async (req, res) => {
  const limitRaw = qString(req.query.limit);
  const offsetRaw = qString(req.query.offset);
  const limit = limitRaw === null ? 25 : Number(limitRaw);
  const offset = offsetRaw === null ? 0 : Number(offsetRaw);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'limit must be 1-100' },
    });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'offset must be >= 0' },
    });
  }

  try {
    // Single JOIN instead of one query per booking: the previous shape ran a
    // buildBookingPayload query for every row (N+1).
    const found = await db.query(
      `SELECT b.id, b.show_id, b.booking_code, b.seats, b.total_amount,
              b.status, b.created_at,
              m.title, t.name AS theatre, s.date, s.start_time
       FROM bookings b
       JOIN shows s ON s.id = b.show_id
       JOIN movies m ON m.id = s.movie_id
       JOIN theatres t ON t.id = s.theatre_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return res.json(found.rows.map(toBookingPayload));
  } catch (err) {
    console.error('My bookings error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } });
  }
});

/** GET /api/bookings/:id (protected) — 404 unless it belongs to the caller */
router.get('/:id', requireAuth, async (req, res) => {
  const id = qId(req.params.id);

  if (id === null) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
  }

  try {
    const found = await db.query(
      `SELECT b.id, b.show_id, b.booking_code, b.seats, b.total_amount,
              b.status, b.created_at,
              m.title, t.name AS theatre, s.date, s.start_time
       FROM bookings b
       JOIN shows s ON s.id = b.show_id
       JOIN movies m ON m.id = s.movie_id
       JOIN theatres t ON t.id = s.theatre_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    }

    return res.json(toBookingPayload(found.rows[0]));
  } catch (err) {
    console.error('Get booking error:', err.message);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch booking' } });
  }
});

module.exports = router;
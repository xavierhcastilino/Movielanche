#!/usr/bin/env node
/**
 * Live API regression suite. Requires a running server with a seeded database.
 *
 *   npm start          # in one terminal
 *   npm run test:api   # in another
 *
 * Focuses on the behaviours that are easy to break silently: the seat-lock
 * race, refresh-token rotation, ownership checks, date correctness, and the
 * input-validation edge cases that used to return HTML stack traces.
 */
const BASE = process.env.BASE || 'http://localhost:5000';
let passed = 0;
const failures = [];

function check(label, ok, extra = '') {
  if (ok) passed++;
  else failures.push(label);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? '  ' + extra : ''}`);
}

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  // fetch() throws on a GET with a body, so never send one.
  const sendBody = body === undefined || method === 'GET' || method === 'HEAD'
    ? undefined
    : JSON.stringify(body);
  const res = await fetch(BASE + path, { method, headers, body: sendBody });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return { status: res.status, data, contentType: res.headers.get('content-type') || '' };
}

const uuid = () => (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 12);

async function register(prefix) {
  const email = `${prefix}${uuid()}@example.com`;
  const r = await call('POST', '/api/auth/register', { name: prefix, email, password: 'secret123' });
  if (r.status !== 201) throw new Error('register failed: ' + JSON.stringify(r.data));
  return { access: r.data.accessToken, refresh: r.data.refreshToken, email };
}

async function aShow(minFree = 4) {
  const list = await call('GET', '/api/movies?filter=now_showing');
  for (const m of list.data.data || []) {
    const detail = await call('GET', `/api/movies/${m.id}`);
    for (const date of detail.data.showDates || []) {
      const shows = await call('GET', `/api/movies/${m.id}/shows?date=${date}`);
      for (const th of shows.data.theatres || []) {
        for (const sh of th.shows || []) {
          const seats = await call('GET', `/api/shows/${sh.showId}/seats`);
          const free = (seats.data.seats || []).filter((s) => s.status === 'available');
          if (free.length >= minFree) {
            return { showId: sh.showId, price: seats.data.price, seats: seats.data.seats, free };
          }
        }
      }
    }
  }
  throw new Error('no show with enough free seats');
}

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Creates a throwaway show at a specific local start time, so the suite can test
 * the "has this started?" boundary directly instead of hoping the seed happens
 * to contain such a show. Returns null if it cannot connect.
 */
async function aProbeShow(screen, startTime, seatsPerRow = 8) {
  const client = new Client({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'movielanche',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });
  try {
    await client.connect();
    await client.query('DELETE FROM shows WHERE screen = $1', [screen]);
    const show = await client.query(
      `INSERT INTO shows (movie_id, theatre_id, date, start_time, screen, price)
       SELECT m.id, t.id, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, $2, $1, 200
       FROM movies m CROSS JOIN (SELECT id FROM theatres LIMIT 1) t
       WHERE m.title = 'Inception' RETURNING id, movie_id,
         to_char((NOW() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date`,
      [screen, startTime]
    );
    if (show.rowCount === 0) return null;
    const showId = show.rows[0].id;
    // Wider rows than the seeded A1-E8, so 'A10'/'A12' exist and text sorting
    // would visibly break.
    for (const r of ['A', 'B']) {
      await client.query(
        `INSERT INTO seats (show_id, seat_number, status)
         SELECT $1, $2 || g, 'available' FROM generate_series(1, $3) g`,
        [showId, r, seatsPerRow]
      );
    }
    return { showId: showId, movieId: show.rows[0].movie_id, date: show.rows[0].date };
  } catch (err) {
    console.error('  (probe setup skipped:', err.message + ')');
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

async function dropProbeShow(screen) {
  const client = new Client({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'movielanche',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });
  try {
    await client.connect();
    // Cascades release the seats and booking_seats rows.
    await client.query('DELETE FROM shows WHERE screen = $1', [screen]);
  } catch { /* best effort */ } finally {
    await client.end().catch(() => {});
  }
}

(async () => {
  console.log('='.repeat(74));
  console.log('CATALOG');
  console.log('='.repeat(74));

  const list = await call('GET', '/api/movies');
  check('GET /movies', list.status === 200, `${list.data.count} movies`);
  check('  envelope success/data', list.data.success === true && Array.isArray(list.data.data));

  // --- regression: array params used to throw OUTSIDE the try block, so
  // Express rendered an HTML stack trace. They are now coerced to the first
  // element, so the requirement is "never 500, always JSON".
  for (const q of ['?search=a&search=b', '?genre=a&genre=b', '?language=a&language=b', '?search[x]=1']) {
    const r = await call('GET', '/api/movies' + q);
    check(`array param ${q.slice(0, 18)} -> no 500, JSON`, r.status < 500 && r.contentType.includes('json'),
      `${r.status} ${r.contentType.split(';')[0]}`);
  }
  // and the coerced value must actually filter rather than be ignored
  const arr = await call('GET', '/api/movies?search=dune&search=zzzznotamovie');
  check('  coerced to first value (filters)', arr.status === 200 && arr.data.count === 1, `${arr.data.count} result`);

  // --- regression: id overflow used to 500
  for (const bad of ['99999999999', '2147483648', 'abc', '-1']) {
    const r = await call('GET', '/api/movies/' + bad);
    check(`bad movie id ${bad} -> 404`, r.status === 404, r.status);
  }
  const rSeat = await call('GET', '/api/shows/99999999999/seats');
  check('huge show id -> 404', rSeat.status === 404, rSeat.status);

  // --- LIKE wildcards must be literal
  const pct = await call('GET', '/api/movies?search=%25');
  check('literal % matches nothing', pct.status === 200 && pct.data.count === 0, `${pct.data.count} results`);
  const dune = await call('GET', '/api/movies?search=dune');
  check('search=dune still works', dune.data.count >= 1, dune.data.count);

  // --- pagination
  const p1 = await call('GET', '/api/movies?limit=2');
  check('limit=2 honoured', p1.data.data.length === 2, p1.data.data.length);
  const pBad = await call('GET', '/api/movies?limit=9999');
  check('limit=9999 -> 400', pBad.status === 400, pBad.status);

  // --- regression: dates were off by one east of UTC
  const m1 = (await call('GET', '/api/movies?limit=1')).data.data[0];
  const detail = await call('GET', `/api/movies/${m1.id}`);
  check('showDates populated', (detail.data.showDates || []).length > 0, detail.data.showDates);
  const today = new Date().toISOString().slice(0, 10);
  check('  first showDate is today or later', detail.data.showDates[0] >= today,
    `${detail.data.showDates[0]} >= ${today}`);

  // --- regression: posters 404'd as HTML 200 before real files existed
  const poster = await call('GET', m1.posterUrl);
  check('poster returns an image', poster.status === 200, `${poster.status} ${poster.contentType.split(';')[0]}`);
  const ghost = await call('GET', '/posters/does-not-exist.jpg');
  check('missing asset -> 404 (not HTML 200)', ghost.status === 404, ghost.status);

  // --- regression: /health leaked err.message
  const h = await call('GET', '/api/health');
  check('/health returns JSON only', h.status === 200 && h.data.database === 'connected', JSON.stringify(h.data));

  console.log();
  console.log('='.repeat(74));
  console.log('AUTH');
  console.log('='.repeat(74));

  const alice = await register('alice');
  check('register issues access + refresh', !!alice.access && !!alice.refresh);

  // --- regression: password policy + non-string body
  const weak = await call('POST', '/api/auth/register', { name: 'w', email: `w${uuid()}@example.com`, password: 'short' });
  check('short password -> 400', weak.status === 400, weak.status);
  const longPw = 'x'.repeat(100);
  const over = await call('POST', '/api/auth/register', { name: 'l', email: `l${uuid()}@example.com`, password: longPw });
  check('>72-byte password -> 400 (bcrypt truncation)', over.status === 400, over.status);

  // --- regression: non-string login fields used to 500
  for (const body of [{ email: {}, password: 'x' }, { email: 'a@b.c', password: [] }, { email: [] }, 'notanobject']) {
    const r = await call('POST', '/api/auth/login', body);
    check(`login ${JSON.stringify(body).slice(0, 22)} -> 400 not 500`, r.status === 400, r.status);
  }
  const badJson = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops',
  });
  check('malformed JSON -> 400 JSON', badJson.status === 400
    && (badJson.headers.get('content-type') || '').includes('json'), badJson.status);

  // --- rotation
  const rot = await call('POST', '/api/auth/refresh', { refreshToken: alice.refresh });
  check('refresh -> 200', rot.status === 200, rot.status);
  check('  token rotated', rot.data.refreshToken !== alice.refresh);
  // An immediate retry with the just-spent token is the LOST-RESPONSE case (or a
  // second tab racing), not theft. It gets a distinct code and must NOT destroy
  // the successor the client legitimately holds -- that was logging users out
  // over a single dropped packet.
  const replay = await call('POST', '/api/auth/refresh', { refreshToken: alice.refresh });
  check('replay within grace -> TOKEN_REUSE_GRACE',
    replay.status === 401 && replay.data.error?.code === 'TOKEN_REUSE_GRACE', replay.data.error?.code);
  const after = await call('POST', '/api/auth/refresh', { refreshToken: rot.data.refreshToken });
  check('successor survives the grace-window retry', after.status === 200, after.status);
  check('  refresh returns the documented token alias', 'token' in after.data);

  // --- regression: past the grace window, a replay IS treated as theft
  const thief = await register('thief');
  const t1 = await call('POST', '/api/auth/refresh', { refreshToken: thief.refresh });
  await call('POST', `/_test/age-family/${Buffer.from(thief.refresh).toString('hex')}`);
  const aged = await call('POST', '/api/auth/refresh', { refreshToken: thief.refresh });
  check('replay after the grace window -> TOKEN_REUSE (family revoked)',
    aged.data?.error?.code === 'TOKEN_REUSE', aged.data?.error?.code);
  const dead = await call('POST', '/api/auth/refresh', { refreshToken: t1.data.refreshToken });
  check('  and the successor is revoked with the family', dead.status === 401, dead.status);

  // --- regression: concurrent refresh must not fork the family
  const racer = await register('racer');
  const results = await Promise.all(
    Array.from({ length: 5 }, () => call('POST', '/api/auth/refresh', { refreshToken: racer.refresh }))
  );
  const wins = results.filter((r) => r.status === 200);
  check('5 concurrent refreshes -> exactly 1 winner', wins.length === 1,
    `${wins.length} winners, ${results.filter((r) => r.status === 401).length} rejected`);

  console.log();
  console.log('='.repeat(74));
  console.log('BOOKING');
  console.log('='.repeat(74));

  const bob = await register('bob');
  const firstMovie = (await call('GET', '/api/movies')).data.data[0];

  // --- regression: invalid-but-well-formed dates used to reach the DATE cast
  // and 500. A regex alone accepts 2026-13-45 and 2026-02-31.
  for (const bad of ['2026-13-45', '2026-02-31', '0000-00-00', '2026-00-10']) {
    const r = await call('GET', `/api/movies/${firstMovie.id}/shows?date=${bad}`);
    check(`?date=${bad} -> 400 not 500`, r.status === 400, r.status);
  }
  // --- regression: genre/language filters were case-sensitive
  const langLower = await call('GET', '/api/movies?language=english');
  const langExact = await call('GET', '/api/movies?language=English');
  check('language filter is case-insensitive',
    langLower.data.count === langExact.data.count && langExact.data.count > 0,
    `lower=${langLower.data.count} exact=${langExact.data.count}`);

  // --- regression: health must actually query the database
  const health = await call('GET', '/api/health');
  check('health reports database connectivity',
    health.status === 200 && health.data.database === 'connected', health.status);

  // --- regression: bearer scheme is case-insensitive (RFC 7235)
  const lowerScheme = await fetch(BASE + '/api/bookings/me', {
    headers: { Authorization: `bearer ${bob.access}` },
  });
  check('lowercase "bearer" scheme accepted', lowerScheme.status === 200, lowerScheme.status);

  // --- regression: an unbounded name produced a ~7KB JWT header
  const hugeName = await call('POST', '/api/auth/register',
    { name: 'A'.repeat(5000), email: `huge${uuid()}@example.com`, password: 'secret123' });
  check('5000-char name -> 400', hugeName.status === 400, hugeName.status);

  // 6 free seats: 2 consumed by the numeric/string id regression below, 2 for the main booking.
  const show = await aShow(6);
  const pick = show.free.slice(4, 6).map((s) => s.seatNumber);

  check('bad seat format -> 400', (await call('POST', '/api/bookings', { showId: show.showId, seats: ['Z9'] }, bob.access)).status === 400);
  check('duplicate seats -> 400', (await call('POST', '/api/bookings', { showId: show.showId, seats: ['A1', 'A1'] }, bob.access)).status === 400);
  check('7 seats -> 400 (max 6)', (await call('POST', '/api/bookings', { showId: show.showId, seats: ['A1','A2','A3','A4','B1','B2','C1'] }, bob.access)).status === 400);
  check('no auth -> 401', (await call('POST', '/api/bookings', { showId: show.showId, seats: ['A1'] })).status === 401);

  // --- regression: showId arrives as a JSON NUMBER; a string-only id check
  // silently rejected every booking.
  const numericId = await call('POST', '/api/bookings',
    { showId: Number(show.showId), seats: [show.free[0].seatNumber] }, bob.access);
  check('numeric showId in body accepted', numericId.status === 201,
    `${numericId.status} ${numericId.data.error?.code || numericId.data.bookingCode}`);
  const stringId = await call('POST', '/api/bookings',
    { showId: String(show.showId), seats: [show.free[1].seatNumber] }, bob.access);
  check('string showId in body accepted', stringId.status === 201,
    `${stringId.status} ${stringId.data.error?.code || stringId.data.bookingCode}`);

  const booked = await call('POST', '/api/bookings', { showId: show.showId, seats: pick }, bob.access);
  check('book -> 201', booked.status === 201, `${booked.status} ${booked.data.bookingCode || ''}`);
  check('  total = price x seats', booked.data.totalAmount === show.price * pick.length,
    `${booked.data.totalAmount} vs ${show.price * pick.length}`);
  for (const k of ['bookingId', 'bookingCode', 'movie', 'theatre', 'date', 'startTime', 'seats', 'totalAmount', 'status', 'createdAt']) {
    check('  payload has ' + k, k in booked.data, k === 'bookingId' ? booked.data[k] : '');
  }
  check('  date not shifted', booked.data.date >= today, `${booked.data.date} >= ${today}`);

  // ownership
  const mallory = await register('mallory');
  const stolen = await call('GET', `/api/bookings/${booked.data.bookingId}`, undefined, mallory.access);
  check('other user cannot read booking -> 404', stolen.status === 404, stolen.status);

  // --- regression: a failed retry must not free earlier seats
  const again = await call('POST', '/api/bookings', { showId: show.showId, seats: pick }, bob.access);
  check('rebook own seats -> 409', again.status === 409, again.status);
  const afterSeats = await call('GET', `/api/shows/${show.showId}/seats`);
  const map = Object.fromEntries(afterSeats.data.seats.map((s) => [s.seatNumber, s.status]));
  check('REGRESSION: retry did not free my seats', pick.every((s) => map[s] === 'booked'),
    pick.map((s) => `${s}=${map[s]}`).join(' '));

  // --- regression: past shows were bookable
  const past = await call('GET', '/api/movies?filter=now_showing&limit=100');
  let pastChecked = false;
  for (const m of past.data.data || []) {
    const d = await call('GET', `/api/movies/${m.id}`);
    for (const date of d.data.showDates || []) {
      if (date >= today) continue;
      const sh = await call('GET', `/api/movies/${m.id}/shows?date=${date}`);
      for (const th of sh.data.theatres || []) {
        for (const s of th.shows || []) {
          const r = await call('POST', '/api/bookings', { showId: s.showId, seats: ['A1'] }, bob.access);
          check('past show rejected', r.status === 404 && r.data.error?.code === 'SHOW_UNAVAILABLE',
            `${date} ${s.startTime} -> ${r.status}`);
          pastChecked = true;
          break;
        }
      }
    }
  }
  if (!pastChecked) console.log('  (no past-dated shows present, past-show guard not exercised)');

  // --- the race
  console.log();
  console.log('='.repeat(74));
  console.log('CONCURRENT SEAT RACE');
  console.log('='.repeat(74));
  const raceShow = await aShow(2);
  const raceSeats = raceShow.free.slice(0, 2).map((s) => s.seatNumber);
  const tokens = await Promise.all(Array.from({ length: 5 }, (_, i) => register(`r${i}`)));
  const outs = await Promise.all(tokens.map((t) =>
    call('POST', '/api/bookings', { showId: raceShow.showId, seats: raceSeats }, t.access)));
  const wins2 = outs.filter((r) => r.status === 201).length;
  const conflicts = outs.filter((r) => r.status === 409).length;
  check('exactly 1 winner', wins2 === 1, `${wins2} winners, ${conflicts} conflicts`);
  check('other 4 got 409', conflicts === 4, conflicts);
  const raceSeatsAfter = await call('GET', `/api/shows/${raceShow.showId}/seats`);
  const got = raceSeatsAfter.data.seats
    .filter((s) => raceSeats.includes(s.seatNumber) && s.status === 'booked')
    .map((s) => s.seatNumber).sort();
  check('both seats booked exactly once', JSON.stringify(got) === JSON.stringify([...raceSeats].sort()), got.join(','));

  // --- N+1 check: bookings/me still returns full payloads in one query
  const mine = await call('GET', '/api/bookings/me', undefined, bob.access);
  check('bookings/me returns joined payloads', mine.status === 200 && mine.data.length >= 1,
    `${mine.data.length} bookings`);
  check('  payload complete (movie+theatre+date)',
    mine.data.every((b) => b.movie && b.theatre && b.date), mine.data[0]?.bookingCode);
  const minePaged = await call('GET', '/api/bookings/me?limit=1', undefined, bob.access);
  check('  limit honoured', minePaged.data.length <= 1, minePaged.data.length);

  // --- regression: the booking cutoff was compared against the DATABASE clock
  // (hosted Postgres runs UTC) while show times are IST wall-clock. At 21:14 IST
  // the DB read 15:44, so a 20:00 show passed as "not yet started" and returned
  // 201. Build the boundary from IST and assert the API agrees.
  const pad = (n) => String(n).padStart(2, '0');
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const istHHMM = `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
  const probe = await aProbeShow('TZ Regression', istHHMM, 8);
  if (probe) {
    const attempt = await call('POST', '/api/bookings',
      { showId: probe.showId, seats: ['A1'] }, bob.access);
    check('a show starting exactly now is NOT bookable', attempt.status !== 201, attempt.status);

    const listed = await call('GET', `/api/movies/${probe.movieId}/shows?date=${probe.date}`);
    const rows = listed.data.data || [];
    const leaked = rows.filter((r) => String(r.startTime || '') <= istHHMM);
    check('listing hides shows that already started', leaked.length === 0,
      `${leaked.length} of ${rows.length} leaked`);

    const grid = await call('GET', `/api/shows/${probe.showId}/seats`);
    check('seat grid marks a started show unbookable', grid.data.bookable === false,
      `bookable=${grid.data.bookable}`);
    check('seat grid carries show metadata',
      !!grid.data.movie && !!grid.data.theatre && !!grid.data.date && !!grid.data.timezone,
      JSON.stringify({ m: !!grid.data.movie, t: !!grid.data.theatre, tz: grid.data.timezone }));
    await dropProbeShow('TZ Regression');
  } else {
    check('timezone probe show created', false, 'setup failed');
  }

  // --- regression: seat numbers sorted as TEXT, so 'A10' came before 'A2'.
  const wide = await aProbeShow('Wide Row', '23:59', 12);
  if (wide) {
    const g = await call('GET', `/api/shows/${wide.showId}/seats`);
    const order = g.data.seats.map((s) => s.seatNumber);
    // Group by row letter, then require each row's numbers to ascend. Sorting
    // the flat list as text put 'A10' before 'A2'.
    const byRow = new Map();
    for (const sn of order) {
      const row = sn.replace(/[0-9]/g, '');
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row).push(Number(sn.replace(/[^0-9]/g, '')));
    }
    const rows = [...byRow.values()];
    const sorted = rows.every((r) => r.every((v, i) => i === 0 || r[i - 1] < v));
    // The decisive case is index 9: text order gives 'A10' immediately after
    // 'A1'; numeric order must give it after 'A9'.
    const ok = sorted && order[9] === 'A10' && order[8] === 'A9';
    check('seat numbers sort numerically, not as text', ok, order.slice(0, 12).join(','));
    await dropProbeShow('Wide Row');
  }

  console.log();
  console.log('='.repeat(74));
  console.log(`RESULT: ${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log('FAILED: ' + failures.join('; '));
  console.log('='.repeat(74));
  process.exit(failures.length ? 1 : 0);
})().catch((err) => {
  console.error('\nSuite crashed:', err.message);
  console.error('Is the server running?  npm start');
  process.exit(1);
});
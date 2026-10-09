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
  const replay = await call('POST', '/api/auth/refresh', { refreshToken: alice.refresh });
  check('replay -> 401 TOKEN_REUSE', replay.status === 401 && replay.data.error?.code === 'TOKEN_REUSE',
    replay.data.error?.code);
  const after = await call('POST', '/api/auth/refresh', { refreshToken: rot.data.refreshToken });
  check('successor also revoked', after.status === 401, after.status);

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
// Proves /api/movies satisfies the committed frontend's expectations by
// replaying public/app.js's own success check and field reads against the
// live API. Exits non-zero if the contract is broken.
const BASE = process.env.BASE || 'http://localhost:5000';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

(async () => {
  const failures = [];
  const check = (label, ok, extra) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? '  ' + extra : ''}`);
    if (!ok) failures.push(label);
  };

  const res = await fetch(`${BASE}/api/movies`);
  check('GET /api/movies -> 200', res.ok, `status=${res.status}`);
  const data = await res.json();

  // Exactly the check public/app.js performs.
  check('data.success is truthy', !!data.success, `success=${data.success}`);
  check('data.data is an array', Array.isArray(data.data),
    `type=${Array.isArray(data.data) ? 'array' : typeof data.data}`);

  const moviesList = data.data || [];
  check('grid is non-empty', moviesList.length > 0, `${moviesList.length} movies`);

  // Exactly the fallback chain app.js uses per card.
  const rendered = moviesList.map((movie) => {
    const title = movie.title || movie.name || movie.movie_name || `Movie #${movie.id}`;
    const year = movie.year || movie.release_year || movie.release_date || '';
    const genre = movie.genre || movie.genres || movie.category || '';
    const rating = movie.rating || movie.imdb_rating || movie.score || '';
    const image = movie.poster || movie.poster_url || movie.image || movie.img_url || '';
    return { title, year, genre, rating, image };
  });

  check('every card has a title', rendered.every((r) => !!r.title),
    rendered.slice(0, 3).map((r) => r.title).join(' | '));
  check('every card shows a year', rendered.every((r) => r.year !== ''),
    rendered.slice(0, 3).map((r) => r.year).join(' | '));
  check('every card shows a genre', rendered.every((r) => r.genre !== ''),
    rendered.slice(0, 3).map((r) => r.genre).join(' | '));
  check('every card shows a rating', rendered.every((r) => r.rating !== ''),
    rendered.slice(0, 3).map((r) => r.rating).join(' | '));
  check('every card has a poster URL', rendered.every((r) => r.image !== ''),
    rendered.slice(0, 2).map((r) => r.image).join(' | '));

  // Poster files must actually be served, or the grid shows broken images.
  const missing = [];
  for (const p of rendered.slice(0, 6)) {
    if (!p.image) continue;
    const abs = p.image.startsWith('http') ? p.image : `${BASE}${p.image}`;
    const r = await fetch(abs);
    if (!r.ok) missing.push(`${p.image}=${r.status}`);
  }
  check('poster assets served', missing.length === 0, missing.join(', ') || 'all ok');

  console.log('');
  console.log(failures.length === 0
    ? 'RESULT: frontend contract OK'
    : `RESULT: ${failures.length} contract break(s): ${failures.join('; ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
})();
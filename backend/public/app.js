document.addEventListener('DOMContentLoaded', () => {
  const statusMsg = document.getElementById('status-message');
  const moviesContainer = document.getElementById('movies-container');
  const modal = document.getElementById('detail-modal');
  const modalBody = document.getElementById('modal-body');
  const closeModalBtn = document.getElementById('close-modal-btn');

  let moviesList = [];

  // Fetch movies from backend API
  async function fetchMovies() {
    try {
      const response = await fetch('/api/movies');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load movies');
      }

      moviesList = data.data;

      if (moviesList.length === 0) {
        statusMsg.textContent = 'No movies found in the database. (Make sure your "movies" table has rows)';
        statusMsg.classList.remove('error');
        return;
      }

      statusMsg.style.display = 'none';
      renderMovies(moviesList);
    } catch (err) {
      console.error('Error fetching movies:', err);
      statusMsg.textContent = `Error connecting to database: ${err.message}`;
      statusMsg.classList.add('error');
    }
  }

  // Render movie grid
  function renderMovies(movies) {
    moviesContainer.innerHTML = '';

    movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';

      // Dynamically detect fields (handles variations like title/name, year/release_year, image/poster)
      const title = movie.title || movie.name || movie.movie_name || `Movie #${movie.id}`;
      const year = movie.year || movie.release_year || movie.release_date || '';
      const genre = movie.genre || movie.genres || movie.category || '';
      const rating = movie.rating || movie.imdb_rating || movie.score || '';
      const image = movie.poster || movie.poster_url || movie.image || movie.img_url || '';

      const imageHtml = image 
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="poster-img" onerror="this.outerHTML='<div class=\\'poster-placeholder\\'>No Poster</div>'">`
        : `<div class="poster-placeholder">No Poster</div>`;

      card.innerHTML = `
        ${imageHtml}
        <div class="card-body">
          <h3 class="movie-title">${escapeHtml(String(title))}</h3>
          <div class="movie-meta">
            ${year ? `<span>📅 ${escapeHtml(String(year))}</span>` : ''}
            ${rating ? `<span>⭐ ${escapeHtml(String(rating))}</span>` : ''}
            ${genre ? `<div>🏷️ ${escapeHtml(String(genre))}</div>` : ''}
          </div>
          <button class="view-btn" data-id="${movie.id}">View Details</button>
        </div>
      `;

      card.querySelector('.view-btn').addEventListener('click', () => openDetailModal(movie));
      moviesContainer.appendChild(card);
    });
  }

  // Open detail modal with full details
  function openDetailModal(movie) {
    const title = movie.title || movie.name || movie.movie_name || `Movie Details #${movie.id}`;

    let tableRows = '';
    for (const [key, value] of Object.entries(movie)) {
      if (value === null || value === undefined) continue;

      const formattedKey = key.replace(/_/g, ' ');
      let formattedVal = value;

      // Handle objects or arrays if present
      if (typeof value === 'object') {
        formattedVal = JSON.stringify(value, null, 2);
      }

      tableRows += `
        <tr>
          <th>${escapeHtml(formattedKey)}</th>
          <td>${escapeHtml(String(formattedVal))}</td>
        </tr>
      `;
    }

    modalBody.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(String(title))}</h2>
      </div>
      <table class="detail-table">
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    modal.classList.remove('hidden');
  }

  // Close modal logic
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Utility to prevent XSS
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  fetchMovies();
});

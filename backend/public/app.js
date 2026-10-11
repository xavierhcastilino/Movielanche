document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Navigation & Headers
  const tabMovies = document.getElementById('tab-movies');
  const tabBooking = document.getElementById('tab-booking');
  const sectionMovies = document.getElementById('section-movies');
  const sectionBooking = document.getElementById('section-booking');

  const btnAlice = document.getElementById('switch-user-alice');
  const btnBob = document.getElementById('switch-user-bob');
  const userNav = document.getElementById('user-nav');
  const openLoginBtn = document.getElementById('open-login-btn');
  const openSignupBtn = document.getElementById('open-signup-btn');

  // Banners & Notifications
  const timeoutBanner = document.getElementById('timeout-banner');
  const timeoutCountdown = document.getElementById('timeout-countdown');
  const notificationContainer = document.getElementById('notification-container');

  // Movies Catalogue Elements
  const statusMsg = document.getElementById('status-message');
  const moviesContainer = document.getElementById('movies-container');
  const searchInput = document.getElementById('search-input');
  const genreSelect = document.getElementById('genre-select');
  const detailModal = document.getElementById('detail-modal');
  const modalBody = document.getElementById('modal-body');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Booking Template Elements
  const showSelect = document.getElementById('show-select');
  const refreshSeatsBtn = document.getElementById('refresh-seats-btn');
  const seatGrid = document.getElementById('seat-grid');

  // Action Panels
  const noSeatSelectedPanel = document.getElementById('no-seat-selected');
  const activeLockPanel = document.getElementById('active-lock-panel');
  const queueStatusPanel = document.getElementById('queue-status-panel');
  const bookingSuccessPanel = document.getElementById('booking-success-panel');

  const lockedSeatNum = document.getElementById('locked-seat-num');
  const lockTimerDisplay = document.getElementById('lock-timer');
  const timerProgressBar = document.getElementById('timer-progress');
  const bookingConfirmForm = document.getElementById('booking-confirm-form');
  const custNameInput = document.getElementById('cust-name');
  const custEmailInput = document.getElementById('cust-email');
  const paymentMethodSelect = document.getElementById('payment-method');
  const bookingPriceDisplay = document.getElementById('booking-price');
  const cancelLockBtn = document.getElementById('cancel-lock-btn');

  const queuePosNum = document.getElementById('queue-pos-num');
  const queuedSeatNum = document.getElementById('queued-seat-num');
  const leaveQueueBtn = document.getElementById('leave-queue-btn');

  const ticketCode = document.getElementById('ticket-code');
  const ticketMovie = document.getElementById('ticket-movie');
  const ticketTheatre = document.getElementById('ticket-theatre');
  const ticketSeats = document.getElementById('ticket-seats');
  const ticketAmount = document.getElementById('ticket-amount');
  const bookAnotherBtn = document.getElementById('book-another-btn');

  // Auth Modal Elements
  const authModal = document.getElementById('auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-btn');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authAlert = document.getElementById('auth-alert');
  const forgotForm = document.getElementById('forgot-form');

  // State Variables
  let currentUser = null;
  let demoUsers = [];
  let currentShowId = null;
  let currentShowsList = [];
  let currentSeatsData = [];
  let activeLockedSeat = null;
  let activeQueuedSeat = null;

  let timerInterval = null;
  let penaltyInterval = null;
  let seatPollInterval = null;
  let notifPollInterval = null;
  let readNotifIds = new Set();

  // Initialization
  initApp();

  async function initApp() {
    await fetchDemoUsers();
    initAuthSession();
    fetchMovies();
    fetchShowsList();

    // Start background seat and notification polling
    seatPollInterval = setInterval(pollCurrentSeatMap, 2500);
    notifPollInterval = setInterval(pollNotifications, 3000);
  }

  // --- DEMO USER SWITCHER & AUTH ---
  async function fetchDemoUsers() {
    try {
      const res = await fetch('/api/auth/demo-users');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        demoUsers = data.data;
      }
    } catch (err) {
      console.error('Failed to fetch demo users:', err);
    }
  }

  function initAuthSession() {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch {
        currentUser = null;
      }
    }

    // Default to Alice if no session
    if (!currentUser && demoUsers.length > 0) {
      switchDemoUser(demoUsers[0]);
    } else {
      updateUserUI();
    }
  }

  function switchDemoUser(userObj) {
    if (!userObj) return;
    currentUser = { id: String(userObj.id), name: userObj.name, email: userObj.email };
    localStorage.setItem('token', userObj.token);
    localStorage.setItem('user', JSON.stringify(currentUser));

    if (custNameInput) custNameInput.value = currentUser.name;
    if (custEmailInput) custEmailInput.value = currentUser.email;

    updateUserUI();
    showToast(`Switched active session to ${currentUser.name}`, 'info');

    // Reset lock timers and refresh seat grid
    clearInterval(timerInterval);
    activeLockedSeat = null;
    activeQueuedSeat = null;

    if (currentShowId) {
      fetchSeatMap(currentShowId);
    }
  }

  function updateUserUI() {
    // Update Demo User Switcher buttons state
    if (btnAlice && btnBob) {
      btnAlice.classList.remove('active');
      btnBob.classList.remove('active');

      if (currentUser && currentUser.email.includes('alice')) {
        btnAlice.classList.add('active');
      } else if (currentUser && currentUser.email.includes('bob')) {
        btnBob.classList.add('active');
      }
    }

    // Update Header Nav
    if (userNav) {
      if (currentUser) {
        userNav.innerHTML = `
          <span class="user-welcome">👤 ${escapeHtml(currentUser.name)}</span>
          <button id="logout-btn" class="nav-btn secondary">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
      } else {
        userNav.innerHTML = `
          <button id="open-login-btn" class="nav-btn primary">Log In</button>
          <button id="open-signup-btn" class="nav-btn secondary">Sign Up</button>
        `;
        document.getElementById('open-login-btn').addEventListener('click', () => openAuthModal('login'));
        document.getElementById('open-signup-btn').addEventListener('click', () => openAuthModal('signup'));
      }
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateUserUI();
    showToast('Logged out of session', 'info');
  }

  // --- VIEW TABS SWITCHING ---
  tabMovies.addEventListener('click', () => {
    tabMovies.classList.add('active');
    tabBooking.classList.remove('active');
    sectionMovies.classList.remove('hidden');
    sectionBooking.classList.add('hidden');
  });

  tabBooking.addEventListener('click', () => {
    tabBooking.classList.add('active');
    tabMovies.classList.remove('active');
    sectionBooking.classList.remove('hidden');
    sectionMovies.classList.add('hidden');
    if (!currentShowId && currentShowsList.length > 0) {
      onShowSelectChange(currentShowsList[0].id);
    }
  });

  // Switch User Button Event Listeners
  if (btnAlice) {
    btnAlice.addEventListener('click', () => {
      const alice = demoUsers.find(u => u.email.includes('alice')) || demoUsers[0];
      if (alice) switchDemoUser(alice);
    });
  }

  if (btnBob) {
    btnBob.addEventListener('click', () => {
      const bob = demoUsers.find(u => u.email.includes('bob')) || demoUsers[1];
      if (bob) switchDemoUser(bob);
    });
  }

  // --- FETCH MOVIES CATALOGUE ---
  async function fetchMovies() {
    try {
      statusMsg.style.display = 'block';
      statusMsg.textContent = 'Loading movies from database...';

      const searchVal = searchInput ? searchInput.value.trim() : '';
      const genreVal = genreSelect ? genreSelect.value : '';

      const params = new URLSearchParams();
      if (searchVal) params.append('search', searchVal);
      if (genreVal) params.append('genre', genreVal);

      const res = await fetch(`/api/movies${params.toString() ? '?' + params.toString() : ''}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to load movies');
      }

      const movies = data.data || [];
      if (movies.length === 0) {
        statusMsg.textContent = 'No movies found matching criteria.';
        moviesContainer.innerHTML = '';
        return;
      }

      statusMsg.style.display = 'none';
      renderMoviesGrid(movies);
    } catch (err) {
      statusMsg.textContent = `Error: ${err.message}`;
      statusMsg.classList.add('error');
    }
  }

  function renderMoviesGrid(movies) {
    moviesContainer.innerHTML = '';

    movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';

      const title = movie.movie_title || movie.title || `Movie #${movie.id}`;
      const year = movie.release_year || movie.releaseYear || '';
      const genre = movie.genre || (Array.isArray(movie.genres) ? movie.genres.join(', ') : '');
      const rating = movie.rating || '';
      const score = movie.IMDB_score || movie.score || '';
      const poster = movie.image_url || movie.poster_url || '/poster-placeholder.svg';

      card.innerHTML = `
        <div class="poster-placeholder">🎬 ${escapeHtml(title)}</div>
        <div class="card-body">
          <h3 class="movie-title">${escapeHtml(title)}</h3>
          <div class="movie-meta">
            ${year ? `<span>📅 ${escapeHtml(String(year))}</span>` : ''}
            ${rating ? `<span>🏷️ ${escapeHtml(String(rating))}</span>` : ''}
            ${score ? `<span>⭐ IMDB ${escapeHtml(String(score))}</span>` : ''}
          </div>
          ${genre ? `<div class="genre-tag">Genre: ${escapeHtml(String(genre))}</div>` : ''}
          <button class="view-btn book-now-btn" data-movieid="${movie.id}">🎟️ Book Seats</button>
        </div>
      `;

      card.querySelector('.book-now-btn').addEventListener('click', () => {
        tabBooking.click();
        // Find matching show for this movie
        const matchingShow = currentShowsList.find(s => String(s.movieId) === String(movie.id));
        if (matchingShow) {
          showSelect.value = matchingShow.id;
          onShowSelectChange(matchingShow.id);
        }
      });

      moviesContainer.appendChild(card);
    });
  }

  // --- FETCH SHOW TIMINGS ---
  async function fetchShowsList() {
    try {
      const res = await fetch('/api/shows');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        currentShowsList = data.data;
        populateShowSelect(currentShowsList);
      }
    } catch (err) {
      console.error('Failed to fetch shows:', err);
    }
  }

  function populateShowSelect(shows) {
    if (!showSelect) return;
    showSelect.innerHTML = '';

    if (shows.length === 0) {
      showSelect.innerHTML = '<option value="">No show timings available</option>';
      return;
    }

    shows.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title} — ${s.theatreName} (${s.screen}) | ${s.date} @ ${s.startTime} (₹${s.price})`;
      showSelect.appendChild(opt);
    });

    currentShowId = shows[0].id;
    fetchSeatMap(currentShowId);
  }

  showSelect.addEventListener('change', (e) => {
    onShowSelectChange(e.target.value);
  });

  function onShowSelectChange(showId) {
    currentShowId = showId;
    clearInterval(timerInterval);
    activeLockedSeat = null;
    activeQueuedSeat = null;
    showActionPanel('none');
    fetchSeatMap(currentShowId);
  }

  refreshSeatsBtn.addEventListener('click', () => {
    if (currentShowId) fetchSeatMap(currentShowId);
  });

  // --- SEAT GRID FETCHING & RENDERING ---
  async function fetchSeatMap(showId) {
    if (!showId) return;

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/shows/${showId}/seats`, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch seats');
      }

      currentSeatsData = data.seats || [];

      // Check User 30-Second Penalty Timeout
      if (data.userTimeout && data.userTimeout.inTimeout) {
        startPenaltyCountdown(data.userTimeout.remainingSeconds);
      } else {
        hidePenaltyBanner();
      }

      renderSeatGrid(currentSeatsData);
      updateActionPanels(currentSeatsData, data.price);
    } catch (err) {
      console.error('Error fetching seats:', err);
    }
  }

  function pollCurrentSeatMap() {
    if (currentShowId && sectionBooking && !sectionBooking.classList.contains('hidden')) {
      fetchSeatMap(currentShowId);
    }
  }

  function renderSeatGrid(seats) {
    seatGrid.innerHTML = '';

    seats.forEach(s => {
      const btn = document.createElement('button');
      btn.className = `seat-btn ${s.status}`;
      btn.dataset.seat = s.seatNumber;

      let labelText = s.seatNumber;
      let badgeHtml = '';

      if (s.status === 'booked') {
        btn.classList.add('booked');
        btn.disabled = true;
      } else if (s.lockedByMe) {
        btn.classList.add('locked-me');
        badgeHtml = `<span class="seat-badge">🔒 5m</span>`;
        activeLockedSeat = s;
      } else if (s.queuedByMe) {
        btn.classList.add('queued-me');
        badgeHtml = `<span class="seat-badge">⏳ #${s.myQueuePosition}</span>`;
        activeQueuedSeat = s;
      } else if (s.status === 'locked') {
        btn.classList.add('locked-other');
        badgeHtml = `<span class="seat-badge">🔒 Locked</span>`;
      } else {
        btn.classList.add('available');
      }

      btn.innerHTML = `${labelText} ${badgeHtml}`;
      btn.addEventListener('click', () => handleSeatClick(s));
      seatGrid.appendChild(btn);
    });
  }

  // --- SEAT CLICK & LOCK/QUEUE HANDLER ---
  async function handleSeatClick(seatObj) {
    const token = localStorage.getItem('token');
    if (!token) {
      openAuthModal('login');
      return;
    }

    if (seatObj.status === 'booked') return;

    try {
      // Call lock endpoint
      const res = await fetch('/api/bookings/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showId: currentShowId, seatNumber: seatObj.seatNumber })
      });

      const data = await res.json();

      if (res.status === 403 && data.error?.code === 'USER_IN_TIMEOUT') {
        startPenaltyCountdown(data.error.remainingSeconds || 30);
        showToast(`⚠️ You are in a 30s penalty timeout for an expired lock!`, 'warning');
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Lock failed');
      }

      if (data.status === 'LOCKED') {
        showToast(`🔒 Seat ${seatObj.seatNumber} locked for 5 minutes!`, 'success');
        startLockTimer(data.remainingSeconds || 300);
      } else if (data.status === 'QUEUED') {
        showToast(`⏳ Seat ${seatObj.seatNumber} is locked by another user. You are locked in Queue #${data.queuePosition}!`, 'info');
      }

      fetchSeatMap(currentShowId);
    } catch (err) {
      showToast(err.message, 'warning');
    }
  }

  // --- UPDATE ACTION PANELS & TIMERS ---
  function updateActionPanels(seats, price) {
    const myLocked = seats.find(s => s.lockedByMe);
    const myQueued = seats.find(s => s.queuedByMe);

    if (bookingSuccessPanel.classList.contains('hidden') === false && !myLocked) {
      // Keep success panel visible if user just completed booking
      return;
    }

    if (myLocked) {
      showActionPanel('lock');
      lockedSeatNum.textContent = myLocked.seatNumber;
      bookingPriceDisplay.textContent = `₹${(myLocked.cost || price).toFixed(2)}`;

      if (!timerInterval) {
        startLockTimer(myLocked.callerRemainingSeconds || 300);
      }
    } else if (myQueued) {
      showActionPanel('queue');
      queuedSeatNum.textContent = myQueued.seatNumber;
      queuePosNum.textContent = myQueued.myQueuePosition || 1;
      clearInterval(timerInterval);
    } else {
      showActionPanel('none');
      clearInterval(timerInterval);
    }
  }

  function showActionPanel(type) {
    noSeatSelectedPanel.classList.add('hidden');
    activeLockPanel.classList.add('hidden');
    queueStatusPanel.classList.add('hidden');
    bookingSuccessPanel.classList.add('hidden');

    if (type === 'lock') activeLockPanel.classList.remove('hidden');
    else if (type === 'queue') queueStatusPanel.classList.remove('hidden');
    else if (type === 'success') bookingSuccessPanel.classList.remove('hidden');
    else noSeatSelectedPanel.classList.remove('hidden');
  }

  // 5-Minute Countdown Timer Widget
  function startLockTimer(seconds) {
    clearInterval(timerInterval);
    let remaining = seconds;

    function updateDisplay() {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      lockTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const pct = (remaining / 300) * 100;
      if (timerProgressBar) timerProgressBar.style.width = `${pct}%`;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        showToast('⌛ Your 5-minute seat lock has EXPIRED! You are placed in a 30-second penalty timeout.', 'warning');
        startPenaltyCountdown(30);
        fetchSeatMap(currentShowId);
      } else {
        remaining--;
      }
    }

    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
  }

  // 30-Second Penalty Countdown Banner
  function startPenaltyCountdown(seconds) {
    clearInterval(penaltyInterval);
    let remaining = seconds;

    timeoutBanner.classList.remove('hidden');
    timeoutCountdown.textContent = remaining;

    penaltyInterval = setInterval(() => {
      remaining--;
      timeoutCountdown.textContent = Math.max(0, remaining);

      if (remaining <= 0) {
        clearInterval(penaltyInterval);
        hidePenaltyBanner();
        showToast('✅ Your 30-second penalty timeout has ended. You can lock seats again!', 'success');
      }
    }, 1000);
  }

  function hidePenaltyBanner() {
    clearInterval(penaltyInterval);
    timeoutBanner.classList.add('hidden');
  }

  // --- CONFIRM PAYMENT & BOOKING FORM ---
  bookingConfirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return openAuthModal('login');

    const seatNum = lockedSeatNum.textContent;
    const name = custNameInput.value.trim();
    const email = custEmailInput.value.trim();
    const payMethod = paymentMethodSelect.value;

    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          showId: currentShowId,
          seats: [seatNum],
          customerName: name,
          customerEmail: email,
          paymentMethod: payMethod
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Booking confirmation failed');
      }

      clearInterval(timerInterval);
      showToast(`🎉 Booking Confirmed! Code: ${data.bookingCode}`, 'success');

      // Populate Success Ticket Card
      ticketCode.textContent = data.bookingCode;
      ticketMovie.textContent = data.movie;
      ticketTheatre.textContent = data.theatre;
      ticketSeats.textContent = data.seats.join(', ');
      ticketAmount.textContent = `₹${Number(data.totalAmount).toFixed(2)}`;

      showActionPanel('success');
      fetchSeatMap(currentShowId);
    } catch (err) {
      showToast(`❌ ${err.message}`, 'warning');
    }
  });

  cancelLockBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const seatNum = lockedSeatNum.textContent;
    try {
      await fetch('/api/bookings/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showId: currentShowId, seatNumber: seatNum })
      });

      clearInterval(timerInterval);
      showToast(`Cancelled lock for seat ${seatNum}`, 'info');
      showActionPanel('none');
      fetchSeatMap(currentShowId);
    } catch (err) {
      console.error(err);
    }
  });

  leaveQueueBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const seatNum = queuedSeatNum.textContent;
    try {
      await fetch('/api/bookings/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showId: currentShowId, seatNumber: seatNum })
      });

      showToast(`Left queue for seat ${seatNum}`, 'info');
      showActionPanel('none');
      fetchSeatMap(currentShowId);
    } catch (err) {
      console.error(err);
    }
  });

  bookAnotherBtn.addEventListener('click', () => {
    showActionPanel('none');
    fetchSeatMap(currentShowId);
  });

  // --- NOTIFICATION POLLING ---
  async function pollNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/bookings/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        data.data.forEach(n => {
          if (!readNotifIds.has(n.id)) {
            readNotifIds.add(n.id);
            showToast(n.message, 'success');
            fetchSeatMap(currentShowId);
          }
        });
      }
    } catch (err) {
      // Ignore background notification errors
    }
  }

  // --- TOAST ALERTS ---
  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `<strong>${escapeHtml(msg)}</strong>`;

    notificationContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4500);
  }

  // --- AUTH MODALS & HELPERS ---
  let modalGoogleInitDone = false;
  async function initModalGoogleAuth() {
    const modalBtnContainer = document.getElementById('modal-google-btn-container');
    const modalNotice = document.getElementById('modal-google-notice');
    if (!modalBtnContainer) return;

    try {
      const sessionSavedId = sessionStorage.getItem('movielanche_google_client_id');
      let clientId = sessionSavedId || '';

      if (!clientId) {
        const res = await fetch('/api/auth/config');
        const data = await res.json();
        if (data.success && data.isConfigured && data.clientId) {
          clientId = data.clientId;
        }
      }

      if (clientId) {
        if (modalNotice) modalNotice.classList.add('hidden');
        renderGoogleModalButton(clientId);
      } else {
        if (modalNotice) modalNotice.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Failed to load Google Auth config in modal:', err);
    }
  }

  function renderGoogleModalButton(clientId) {
    const modalBtnContainer = document.getElementById('modal-google-btn-container');
    if (!modalBtnContainer) return;
    const interval = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(interval);
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleModalGoogleCallback,
            auto_select: false
          });
          modalBtnContainer.innerHTML = '';
          google.accounts.id.renderButton(modalBtnContainer, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            width: 280
          });
          modalGoogleInitDone = true;
        } catch (e) {
          console.error('Google button render error:', e);
        }
      }
    }, 150);
    setTimeout(() => clearInterval(interval), 8000);
  }

  const modalClientIdBtn = document.getElementById('modal-client-id-btn');
  if (modalClientIdBtn) {
    modalClientIdBtn.addEventListener('click', () => {
      const input = document.getElementById('modal-client-id-input');
      const val = input ? input.value.trim() : '';
      if (val) {
        sessionStorage.setItem('movielanche_google_client_id', val);
        const modalNotice = document.getElementById('modal-google-notice');
        if (modalNotice) modalNotice.classList.add('hidden');
        renderGoogleModalButton(val);
      }
    });
  }

  async function handleModalGoogleCallback(response) {
    if (!response || !response.credential) return;
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Google authentication failed');

      localStorage.setItem('token', data.token || data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      updateUserUI();
      closeAuthModal();
      showToast(`Welcome, ${currentUser.name}! Signed in via Google.`, 'success');
      if (currentShowId) fetchSeatMap(currentShowId);
    } catch (err) {
      authAlert.textContent = err.message;
      authAlert.classList.remove('hidden');
    }
  }

  function openAuthModal(tab = 'login') {
    authAlert.classList.add('hidden');
    authModal.classList.remove('hidden');
    switchAuthTab(tab);
    initModalGoogleAuth();
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
  }

  function switchAuthTab(tab) {
    authAlert.classList.add('hidden');
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      if (forgotForm) forgotForm.classList.add('hidden');
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      if (forgotForm) forgotForm.classList.add('hidden');
    }
  }

  closeAuthBtn.addEventListener('click', closeAuthModal);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Login failed');

      localStorage.setItem('token', data.token || data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      updateUserUI();
      closeAuthModal();
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      fetchSeatMap(currentShowId);
    } catch (err) {
      authAlert.textContent = err.message;
      authAlert.classList.remove('hidden');
    }
  });

  const forgotLink = document.getElementById('forgot-link');
  const forgotBack = document.getElementById('forgot-back');
  if (forgotLink) forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    authAlert.classList.add('hidden');
    tabLogin.classList.remove('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotForm.classList.remove('hidden');
  });
  if (forgotBack) forgotBack.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });
  if (forgotForm) forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Request failed");
      showToast(data.message, 'success');
    } catch (err) {
      authAlert.textContent = err.message;
      authAlert.classList.remove('hidden');
    }
  });
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Registration failed');

      localStorage.setItem('token', data.token || data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      updateUserUI();
      closeAuthModal();
      showToast(`Account created! Welcome, ${currentUser.name}`, 'success');
      fetchSeatMap(currentShowId);
    } catch (err) {
      authAlert.textContent = err.message;
      authAlert.classList.remove('hidden');
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

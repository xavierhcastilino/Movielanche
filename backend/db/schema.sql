-- Movielanche schema (PostgreSQL)
--
-- Ports the booking domain from the earlier MongoDB draft to Postgres, since
-- that is the database committed in the repo (pg dependency). Kept in one
-- migration file so a clean clone can `npm run db:setup` and be demo-ready.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per refresh token, family_id ties a rotation lineage together so a
-- replayed token can revoke the whole family. Only the SHA-256 hash is kept.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  family_id     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  replaced_by   TEXT,
  user_agent    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expiry_idx ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS movies (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  genres       TEXT[] NOT NULL DEFAULT '{}',
  language     TEXT NOT NULL DEFAULT 'English',
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  poster_url   TEXT NOT NULL DEFAULT '',
  rating       NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
  release_year INTEGER,
  -- now_showing / coming_soon; matches the value the frontend filters on.
  status       TEXT NOT NULL DEFAULT 'now_showing'
               CHECK (status IN ('now_showing', 'coming_soon'))
);

-- Free-text search on title, and filter support for the discovery flow.
CREATE INDEX IF NOT EXISTS movies_title_lower_idx ON movies (LOWER(title));
CREATE INDEX IF NOT EXISTS movies_genres_idx ON movies USING GIN (genres);
CREATE INDEX IF NOT EXISTS movies_language_idx ON movies (language);
CREATE INDEX IF NOT EXISTS movies_status_idx ON movies (status);

CREATE TABLE IF NOT EXISTS theatres (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS theatres_location_lower_idx ON theatres (LOWER(location));

CREATE TABLE IF NOT EXISTS shows (
  id         SERIAL PRIMARY KEY,
  movie_id   INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  start_time TIME NOT NULL,
  screen     TEXT NOT NULL DEFAULT 'Screen 1',
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS shows_movie_date_idx ON shows (movie_id, date);
CREATE INDEX IF NOT EXISTS shows_theatre_date_idx ON shows (theatre_id, date);

-- One row per bookable seat. The unique constraint is what makes the atomic
-- seat lock in bookings.js safe.
CREATE TABLE IF NOT EXISTS seats (
  id         SERIAL PRIMARY KEY,
  show_id    INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'booked')),
  booked_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, seat_number)
);

CREATE INDEX IF NOT EXISTS seats_show_status_idx ON seats (show_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id      INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  booking_code TEXT NOT NULL UNIQUE,
  seats        TEXT[] NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_user_created_idx
  ON bookings (user_id, created_at DESC);

-- Stops two bookings for one show ever sharing a seat, even if the seat-table
-- lock is bypassed. `unnest()` is not allowed in an index expression, so the
-- normalised join table carries that guarantee instead: one row per booked
-- seat, unique on (show_id, seat_number).
CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  show_id     INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  PRIMARY KEY (show_id, seat_number)
);

CREATE INDEX IF NOT EXISTS booking_seats_booking_idx ON booking_seats (booking_id);
-- Movielanche schema (PostgreSQL)

-- Drop existing views and tables to ensure clean schema build
DROP TABLE IF EXISTS shows CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS theatre_details CASCADE;

DROP TABLE IF EXISTS booking_seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS user_timeouts CASCADE;
DROP TABLE IF EXISTS locking_logs CASCADE;
DROP TABLE IF EXISTS demo_seats CASCADE;
DROP TABLE IF EXISTS showings CASCADE;
DROP TABLE IF EXISTS theatres_details CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS movie_details CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email_id      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  text          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  family_id     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  replaced_by   TEXT,
  user_agent    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movie_details (
  movie_id     SERIAL PRIMARY KEY,
  movie_title  TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  genres       TEXT[] NOT NULL DEFAULT '{}',
  genre        TEXT DEFAULT '',
  language     TEXT NOT NULL DEFAULT 'English',
  duration_min INTEGER CHECK (duration_min > 0),
  release_date DATE,
  release_year INTEGER,
  poster_url   TEXT NOT NULL DEFAULT '/poster-placeholder.svg',
  image_url    TEXT NOT NULL DEFAULT '/poster-placeholder.svg',
  rating       TEXT DEFAULT 'PG-13',
  director     TEXT DEFAULT '',
  "IMDB_score" NUMERIC(3,1) CHECK ("IMDB_score" >= 0 AND "IMDB_score" <= 10),
  status       TEXT NOT NULL DEFAULT 'now_showing' CHECK (status IN ('now_showing', 'coming_soon'))
);

CREATE TABLE IF NOT EXISTS theatres_details (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Downtown'
);

CREATE OR REPLACE VIEW theatre_details AS SELECT id, name, location FROM theatres_details;

CREATE TABLE IF NOT EXISTS showings (
  id           SERIAL PRIMARY KEY,
  movie_id     INTEGER NOT NULL REFERENCES movie_details(movie_id) ON DELETE CASCADE,
  theatre_id   INTEGER NOT NULL REFERENCES theatres_details(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time   TIME NOT NULL,
  screen       TEXT NOT NULL DEFAULT 'Screen 1',
  price        NUMERIC(10,2) NOT NULL DEFAULT 200.00 CHECK (price >= 0),
  runtime      INTEGER DEFAULT 120,
  max_seats    INTEGER DEFAULT 40,
  filled_seats INTEGER DEFAULT 0
);

CREATE OR REPLACE VIEW shows AS 
SELECT id, movie_id, theatre_id, date, start_time, screen, price 
FROM showings;

CREATE TABLE IF NOT EXISTS demo_seats (
  seat_id     SERIAL PRIMARY KEY,
  show_id     INTEGER NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row         VARCHAR(5),
  cost        INTEGER DEFAULT 200,
  isbooked    BOOLEAN NOT NULL DEFAULT FALSE,
  islocked    BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'locked', 'booked')),
  booked_by   INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, seat_number)
);

CREATE OR REPLACE VIEW seats AS 
SELECT seat_id AS id, show_id, seat_number, status, booked_by, created_at 
FROM demo_seats;

-- Table to track seat locking, queueing, and expiration history
CREATE TABLE IF NOT EXISTS locking_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  show_id      INTEGER NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
  movie_id     INTEGER REFERENCES movie_details(movie_id) ON DELETE CASCADE,
  seat_number  TEXT NOT NULL,
  booking_time TIME,
  status       TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'QUEUED', 'CONFIRMED', 'EXPIRED', 'RELEASED', 'CANCELLED')),
  queue_order  INTEGER NOT NULL DEFAULT 1,
  locked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  notified_at  TIMESTAMPTZ,
  isbooked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to track 30-second penalty timeouts for users whose 5-minute lock expired without payment
CREATE TABLE IF NOT EXISTS user_timeouts (
  user_id       INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  timeout_until TIMESTAMPTZ NOT NULL,
  reason        TEXT DEFAULT '5-minute lock expired without booking',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time notification table for users (e.g. when seat opens up for queued 2nd person)
CREATE TABLE IF NOT EXISTS user_notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  show_id     INTEGER NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  show_id        INTEGER NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
  booking_code   TEXT NOT NULL UNIQUE,
  seats          TEXT[] NOT NULL,
  customer_name  TEXT,
  customer_email TEXT,
  total_amount   NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status         TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  show_id     INTEGER NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  PRIMARY KEY (show_id, seat_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS locking_logs_show_seat_idx ON locking_logs (show_id, seat_number, status);
CREATE INDEX IF NOT EXISTS locking_logs_user_idx ON locking_logs (user_id);
CREATE INDEX IF NOT EXISTS demo_seats_show_status_idx ON demo_seats (show_id, status);
CREATE INDEX IF NOT EXISTS user_timeouts_until_idx ON user_timeouts (timeout_until);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Movielanche seed data
--
-- Idempotent: re-running resets the catalogue and rebuilds seats, so a clean
-- clone plus `npm run db:setup` is always demo-ready.

TRUNCATE bookings, seats, shows, theatres, movies RESTART IDENTITY CASCADE;

INSERT INTO movies (title, description, genres, language, duration_min, poster_url, rating, release_year, status) VALUES
('Inception', 'A thief who steals corporate secrets through dream-sharing is offered a chance to erase his criminal record, if he can plant an idea instead.',
 ARRAY['Sci-Fi','Thriller','Action'], 'English', 148, '/posters/inception.jpg', 8.8, 2010, 'now_showing'),
('Interstellar', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
 ARRAY['Sci-Fi','Drama','Adventure'], 'English', 169, '/posters/interstellar.jpg', 8.7, 2014, 'now_showing'),
('RRR', 'A fictional 1920s story about a fictional kingdom on the brink of collapse, told through the lives of three characters.',
 ARRAY['Action','Drama','Musical'], 'Telugu', 187, '/posters/rrr.jpg', 8.3, 2022, 'now_showing'),
('Kantara', 'A young man discovers a divine form that can undo the chaos of the modern world.',
 ARRAY['Action','Drama','Fantasy'], 'Kannada', 168, '/posters/kantara.jpg', 8.1, 2022, 'now_showing'),
('Dune: Part Two', 'Paul Atreides unites with the Fremen to wage war against the conspirators who destroyed his family.',
 ARRAY['Sci-Fi','Adventure'], 'English', 166, '/posters/dune2.jpg', 8.5, 2024, 'now_showing'),
(' Kalki 2898 AD', 'A story set in a future where the world is divided between the privileged and the suppressed.',
 ARRAY['Sci-Fi','Action','Drama'], 'Tamil', 175, '/posters/kalki.jpg', 7.6, 2024, 'coming_soon');

INSERT INTO theatres (name, location) VALUES
('PVR Forum', 'Downtown'),
('INOX Garuda', 'Downtown'),
('Cinepolis Marvel', 'Uptown');

-- 3 shows per movie per day, today through today+2.
DO $$
DECLARE
  m RECORD;
  t RECORD;
  d INTEGER;
  slot INTEGER;
  base_price NUMERIC(10,2);
  st TIME;
BEGIN
  FOR m IN SELECT id, duration_min FROM movies WHERE status = 'now_showing' LOOP
    FOR d IN 0..2 LOOP
      slot := 0;
      FOR t IN SELECT id FROM theatres ORDER BY id LOOP
        slot := slot + 1;
        CASE slot
          WHEN 1 THEN st := '10:30'; base_price := 150;
          WHEN 2 THEN st := '14:00'; base_price := 180;
          ELSE         st := '18:30'; base_price := 220;
        END CASE;

        INSERT INTO shows (movie_id, theatre_id, date, start_time, screen, price)
        VALUES (m.id, t.id, (CURRENT_DATE + d), st, 'Screen ' || slot, base_price);

        -- 40 seats per show: rows A-E, numbers 1-8.
        INSERT INTO seats (show_id, seat_number, status)
        SELECT
          currval(pg_get_serial_sequence('shows','id'))::int,
          chr(65 + r) || c,
          'available'
        FROM generate_series(0,4) AS r, generate_series(1,8) AS c;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Pre-book a few seats so the seat grid shows locked seats on first load,
-- matching the plan's "locked seats (seed data)".
UPDATE seats SET status = 'booked'
WHERE id IN (
  SELECT id FROM seats
  WHERE show_id IN (SELECT id FROM shows ORDER BY id LIMIT 2)
    AND seat_number IN ('B4','C3','D7','E2','A5')
);

DO $$
BEGIN
  RAISE NOTICE 'Seeded movies=%, theatres=%, shows=%, seats=%',
    (SELECT COUNT(*) FROM movies),
    (SELECT COUNT(*) FROM theatres),
    (SELECT COUNT(*) FROM shows),
    (SELECT COUNT(*) FROM seats);
END $$;
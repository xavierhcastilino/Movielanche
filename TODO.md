# MOVIELANCHE — Implementation TODO

## 1. Brand shell, home, responsive navigation, and footer — Complete

**Status: Complete.**

- Create a modern movie ticket booking website called MOVIELANCHE with the tagline “AN AVALANCHE OF MOVIES.” The interface must be original (inspired only by the general booking experience of existing platforms), cinematic, premium, modern, youthful, clean, slightly futuristic and professional, while the Avalanche theme remains subtle rather than literal snow/mountains.
- Use cinematic black `#080808`, secondary black `#101010`, card surface `#151515`, poppy red `#FF3B30`, deep red `#D91E18`, white `#F5F5F5` and muted text `#A5A5A5`. Use Inter or Manrope, clear typography hierarchy, medium corner radius and product-like buttons. Avoid purple, excessive gradients, glow, glassmorphism, pills, cyberpunk styling, childish/cluttered styling, AI-template patterns, meaningless statistics, fake testimonials/reviews/user counts, buzzwords, dashboards and excessive icons.
- Build a clean sticky navbar with MOVIELANCHE, Home, Movies, Bookings, search and profile affordances. Mobile navigation must remain usable and compact (hamburger or equivalent); do not overflow horizontally.
- Home must include a featured-movie cinematic backdrop; headline “THE NEXT BLOCKBUSTER IS ABOUT TO HIT.”; platform description; “Explore Movies” and “View Showtimes” actions; Trending Now with 5–6 cards; horizontal Coming Soon cards; simple Easy Booking, Flexible Shows and Digital Tickets benefits; and a footer with MOVIELANCHE, “An Avalanche of Movies.”, Movies/Bookings/About/Credits links and TMDB attribution.
- Use subtle CSS hover/image/page transitions for ordinary interface interactions, plus the specifically requested ~4-second session intro, 0.9–1.5-second poster transition and 1–1.5-second successful-ticket reveal. Do not use cursor-following motion, excessive parallax, particles, unnecessary loaders or complex animation. Keep every section purposeful.

## 2. Explore page, mock movie catalogue, cards, filtering, and resilience — Complete

**Status: Complete.**

- Build Explore Movies with heading “Explore Movies”, subtitle “Find something worth watching.”, a “Search movies...” field, genre filters All/Action/Drama/Comedy/Thriller/Sci-Fi/Animation, language filters English/Hindi/Kannada/Tamil/Telugu, and Trending/Now Showing/Coming Soon groupings. Use a responsive grid of four cards at desktop, three at tablet and two at mobile.
- Use approximately 12–16 real movies in local mock data. Each movie object has `id`, `title`, `poster`, `backdrop`, `rating`, `genres` (an array), `language`, `duration`, `releaseDate`, `description`, `cast`, `trailerUrl` and `status`. Use real titles and high-quality TMDB-sourced poster/backdrop URLs, not random Unsplash images, generated fake posters, generic colored rectangles or broken URLs. Include the TMDB attribution in the About/Credits area.
- Each movie card displays poster, title, rating, genre and language; use a strong consistent poster ratio and subtle border/hover. On hover/focus, slightly zoom the image, show a dark overlay and a “Book Tickets” action. Provide “View Details”; opening a card navigates to `/movies/:id`.
- Add an image fallback component so failed/loading/unavailable imagery uses a clean MOVIELANCHE fallback, never a broken image box, generic “Movie Poster” text, blank rectangle or blank screen.
- Show “No movies found.” when local search/filter results are empty. Cards, text and buttons must resize without overflow on 375px mobile, 768px tablet, 1280px laptop and 1440px desktop.

## 3. Movie details, trailer modal, and show selection — Complete

**Status: Complete.**

- `/movies/:id` includes a large real movie backdrop with dark readability overlay, poster, title, rating, genre, duration/runtime, language, release date, description, “About the Movie”, cast portraits when available, “Book Tickets”, “Watch Trailer”, “Choose your show”, horizontal date choices, and theatre/showtime options.
- “Watch Trailer” must play inside MOVIELANCHE in a responsive modal using the actual trailer URL/key provided by mock data; do not redirect to YouTube search. The modal opens smoothly, has a close button, closes on outside click, stops playback when closed, works on mobile, and is disabled or clearly unavailable when there is no trailer.
- Provide local theatre/show data with venue name, location and available formats such as 2D, IMAX and 4DX. Provide showtime controls such as 10:30 AM, 1:45 PM, 4:30 PM, 7:30 PM and 10:15 PM, and selectable dates such as Today, Tomorrow, Oct 10, Oct 11 and Oct 12 (or sensible equivalent prototype dates). Selecting a show navigates to `/seats/:showId`; `/shows/:movieId` is available for a separate date/theatre/show step. Only movies marked `now-showing` produce bookable sample showtimes; `coming-soon` titles remain viewable but do not enter the seat/booking flow. Seeded venue/time availability must not be represented as real-time inventory.

## 4. Interactive seat selection and booking summary — Complete

**Status: Complete.**

- `/seats/:showId` has heading “Pick your seats” and displays movie name, theatre, screen, date and time; a simple cinema-screen representation; seat rows A–H; and a clear Available/Selected/Occupied legend.
- Available seats toggle to Selected and back; Occupied seats cannot be selected. Allow a maximum of six seats. Use keyboard-friendly accessible controls and do not communicate seat availability by color alone.
- Display a Booking Summary with movie, theatre, date, time, selected seats, ticket quantity, subtotal, convenience fee and total. Recalculate totals when selection changes; “Continue” navigates to checkout. Seat layout and summary remain usable on mobile.

## 5. Mock checkout, confirmation, digital ticket and print action — Complete

**Status: Complete.**

- `/checkout` is headed “Review your booking” and shows movie, theatre, date, time, seats and price breakdown; a simple contact section with Name, Email and Phone; mock payment methods UPI, Card and Net Banking (selecting one is enough); and “Confirm Booking”.
- Do not create a payment gateway or take payment. “Confirm Booking” creates a frontend-only prototype booking object and navigates to `/booking-confirmation`; communicate that payment/availability is not real.
- Confirmation is visually polished and includes heading “Booking Confirmed”, subtext “Your ticket has landed.”, a digital MOVIELANCHE ticket, movie, theatre, date, time, screen, seats, a booking ID, a decorative QR-style placeholder that need not be a real QR code, “View My Bookings”, and “Download Ticket”. The download action can use a printable ticket/window.print(). Ticket content must remain readable on mobile.

## 6. My Bookings, local persistence, and route behavior — Complete

**Status: Complete.**

- `/bookings` is headed “My Bookings” and has Upcoming and Past tabs. Cards show movie poster/title, theatre, date, time, seats, booking ID, status, and “View Ticket”. Upcoming bookings show “Upcoming”; past bookings show “Completed”.
- Persist confirmed frontend mock bookings in localStorage so bookings remain after refresh. Show “No bookings yet.” when empty. Do not imply the booking is confirmed with a real theatre or payment provider.
- Use React Router. Required routes are `/`, `/movies`, `/movies/:id`, `/shows/:movieId`, `/seats/:showId`, `/checkout`, `/booking-confirmation`, and `/bookings`; `/login` is optional. Browser Back must work naturally.
- Make the entire flow work with local mock data: Home → Movies → Movie Details → Show → Seats → Checkout → Confirmation → My Bookings. Authentication is optional; if shown, offer a simple mock “Continue as Guest” and do not implement real authentication.

## 7. API-ready frontend structure, accessibility, and maintainable code — Complete

**Status: Complete.**

- Use React, TypeScript, Vite, Tailwind CSS, React Router and Lucide React. Use React hooks (`useState`, `useEffect`, `useMemo`) as needed and localStorage for selected seats/bookings (preferences optionally). Do not use Next.js, Redux, Zustand, complex state libraries, backend frameworks, databases, authentication libraries, unnecessary animation libraries, complicated architecture, deeply nested logic, giant components/files, unnecessary custom hooks/components/dependencies, or put the entire app in App.tsx.
- Create simple local data files such as `src/data/movies.ts`, `theatres.ts`, `shows.ts`; types such as `src/types/movie.ts` and `booking.ts`; booking/currency helpers under `src/utils`; and `src/services/api.ts` placeholder functions `getMovies()`, `getMovieById(id)`, `getTheatres()`, `getShows(movieId)`, `getSeats(showId)`, `createBooking(booking)`, with comments that each can be replaced by a backend API later. These functions return local data now. Keep requested modular structure easy for different frontend teammates to merge; use sensible components including Navbar, Footer, MovieCard, MovieRow, Hero, SearchBar, FilterBar, TheatreCard, ShowtimeButton, SeatGrid, BookingSummary, TicketCard, LoadingState and EmptyState where appropriate, but do not create dozens of unnecessary components.
- Use semantic HTML, alt text, accessible buttons and labels, keyboard-friendly controls, sufficient contrast and mobile usability. Include appropriate loading/empty/error states and reliable image fallback. Use icons only when they improve usability.
- Write clear, student-explainable components, props, names and small functions. Comments explain why something exists rather than narrating obvious code. Keep the booking experience the priority.

## 8. Cinematic red identity and session intro — Complete

**Status: Complete.**

- The visual identity must remain consistent throughout the experience. Use cinematic black `#080808`, secondary black `#101010`, card surface `#151515`, poppy red `#FF3B30`, deep red `#D91E18`, white `#F5F5F5`, and muted text `#A5A5A5`. The creative direction is premium cinema, dramatic title sequences, movie-studio idents, theatrical lighting, and fast, controlled motion; use red light streaks, diagonal cuts, layered shadows, subtle film-grain textures, controlled flashes, and carefully timed transitions. Do not use purple gradients, generic AI dashboards, excessive glass effects, constant glowing borders, random animations, or imitate another company's exact logo/intro.
- Create a short cinematic MOVIELANCHE ident lasting 4 seconds, then fade to the existing homepage: begin on black; a tiny red light appears; a thin fast red streak cuts diagonally; a controlled flash reveals the crisp real MOVIELANCHE wordmark; a custom diagonal slash/geometric symbol assembles beside or within it; the wordmark settles with subtle scale/motion; “AN AVALANCHE OF MOVIES” appears underneath; the logo holds briefly before the automatic fade.
- Create a reusable `CinematicIntro` using the actual brand name and tagline. Use a transparent overlay where needed, play once per session rather than on every route change, provide a skip option, respect reduced-motion preferences, and do not make the homepage inaccessible while the intro is playing. Do not assume a generated black-background MP4 is transparent.

## 9. Reusable movie-poster transition and cinematic details reveal — Complete

**Status: Complete.**

- When a user activates a movie poster, capture that movie's ID, poster, title and destination route; slightly scale the poster and add a subtle cinematic shadow; prevent accidental double-click navigation; darken the surrounding interface; expand the selected poster toward the centre; animate diagonal red streaks across the viewport; and use a quick, carefully timed light flash. Transition to the real matching movie-details route, revealing the selected film's actual backdrop, poster, title, metadata, overview, cast and buttons in a controlled stagger. The selected film at the start must be the same film at the destination.
- The transition must work for every movie without hardcoding Spider-Man's title or ID; where Spider-Man exists it may be used as a demo. Play a generated character visual only if genuinely available; otherwise use animated SVG geometric/web-inspired lines, clip-path masks and red trails. Do not show a large rectangular video with an obvious black background over the page.
- Keep the transition approximately 0.9–1.5 seconds, with no long blank screen, delayed/broken navigation, or blocking interaction after it ends. Keep it reusable and accessible with keyboard navigation and reduced-motion support. It must not depend on a fragile network request at click time; any failed external video must fall back to working CSS/SVG effects.
- Continue to use real movie data and real available artwork: do not invent ratings, cast, reviews or video IDs. Keep the actual movie overview, available rating/runtime/release date/genres, cast cards, valid trailer action and existing Book Tickets flow. Missing backdrop, cast image or trailer must not break the page.

## 10. Successful-booking digital-ticket reveal — Complete

**Status: Complete.**

- After and only after the existing supported checkout successfully creates a booking, show a dedicated confirmation view using the actual successful booking response and selected booking state. Never show a successful ticket when booking creation fails. Keep demo payment/availability explicitly labelled as a simulation; do not trigger real payment, fabricate references/seats/prices/payment confirmation, or imply the decorative QR pattern is valid for entry.
- Reuse a `DigitalTicket`/existing ticket component on confirmation and My Bookings. The premium black-and-red ticket contains the actual movie-poster thumbnail, movie title, theatre name, date and showtime, actual selected seats, actual booking reference, and total price; use ticket notches/perforated edges, a vivid red vertical strip or diagonal brand mark, and fine separators. Include a QR code only if validly generated from appropriate booking data; otherwise clearly label the existing decorative pattern as non-scannable.
- Reveal the ticket on a dark background within approximately 1–1.5 seconds: a thin red light sweep; ticket rises from the bottom with smooth perspective/translate-and-scale and settles; the real poster appears; details reveal in a short stagger; finish with a restrained red success effect; then leave the ticket still, readable, mobile-usable and printable.
- Keep working actions for View Ticket, My Bookings, Back to Movies, and the existing printable/download-ticket behavior; each action navigates to the correct existing route or ticket. My Bookings must show the same saved ticket details.

## 11. Subtle motion, resilience, and demo use — Complete

**Status: Complete.**

- After the three signature moments work, use restrained, purposeful motion: movie-card hover scale and controlled red highlight, action-button reveal, smooth carousel scrolling, consistent poster ratios; cinematic homepage backdrop, staggered text and section entrances, only subtle appropriate parallax; smooth active-link underline, search expansion, refined hover/focus and optional slightly more opaque header while scrolling; animated booking step indicator, date/showtime selection, selected-seat feedback, and booking-summary updates. Use the smallest amount of motion that achieves the effect; do not animate every component continuously.
- Prefer existing dependencies, CSS, SVG, React state and the existing router. Do not introduce multiple animation libraries without a clear need. Reuse the actual exported assets and real filenames, do not create empty placeholders or fake video URLs, preload only small needed transition media, avoid blocking the home page, stop video when transition ends, never autoplay audio, and provide a fallback if video loading fails. If generated media is unavailable, keep the experience working with CSS/SVG and report exactly which asset still needs adding.
- The demo sequence must work reliably: open the site and see the animated logo reveal; arrive at the existing homepage; click a featured movie poster; see its cinematic transition; land on that same movie's details; follow the implemented booking flow; complete the supported demo checkout; see the animated ticket reveal; and reopen that saved ticket in My Bookings.
- Preserve all existing functionality, routes, real working booking operations and project structure. Inspect current framework, logo/brand styling, routes, movie card, detail and booking flow, any TMDB integration, image handling, dependencies and existing image/SVG/video assets before modifying. Do not rebuild from scratch, remove working routes, invent external asset URLs or replace real booking operations with fake screens.
- Use accessible controls and keyboard navigation; respect reduced-motion. Run existing build/development checks, fix compilation errors, and verify the intro/session behavior, poster transition and correct destination, no-video fallback, booking confirmation contents, desktop and mobile layouts, reduced-motion behavior, broken images, console errors, and preservation of existing functionality.
- Final report: state the actual files changed; Higgsfield/Hugging Face assets generated (if any); animations implemented and how to trigger them; external assets still needed; features that remain demo-only; and the best sequence for recording the tech-fest demo.

## Completion evidence and verified asset exception

- `pnpm typecheck`, `pnpm build` and `git diff --check` pass. Automated Chromium acceptance visited all 12 movie-detail routes at 1440px, 1280px, 768px and 375px (48 route/viewport visits), and completed the poster-to-details-to-ticket-to-My-Bookings booking flow at each viewport. No horizontal overflow, broken cast portrait, JavaScript error or console error was observed; reduced-motion suppresses the signature overlays.
- The catalogue contains 33 verified TMDB cast portraits (30 newly sourced portraits plus the three previously staged Interstellar portraits), all served from project storage. The Batman's Robert Pattinson, Zoë Kravitz and Paul Dano entries retain the initials fallback because no TMDB profile-image paths could be verified during this pass. No actor likeness was generated.
- No generated video asset was produced; the intro, poster takeover and ticket reveal use the working authored CSS/SVG animation path documented in `CINEMATIC_ASSET_PROMPTS.md`. Movie catalogue, showtimes, inventory, payment choice and bookings remain a local frontend demo; no production API, booking hold, payment, database or authentication is claimed.


## 12. Frontend-only personalization and discovery follow-up — Complete

- Keep public discovery and the existing local booking flow usable without registration or login. Do not simulate successful real authentication, request/store passwords, enable a backend/database, claim live movie/theatre/show/seat availability, or process real payments.
- Add an optional guest-demo profile/preferences page where a visitor can set and edit a demo city, multiple languages, multiple favourite genres, and one or more discovery interests. Persist those preferences in localStorage only, survive page reloads, and identify them clearly as preferences saved in this browser—not account preferences. Only Belagavi has seeded local venue data; other city choices must disclose that no sample theatre/show inventory exists.
- Personalize a “Picked for You” and language-aware section by sorting the existing local movie fixtures against their actual genre/language/release-date/rating metadata, with general discovery still available. Describe this as a deterministic demo recommendation, not machine learning; do not claim the existing 12-film dataset is a live or large catalogue.
- Extend Explore with functional release-year filters, popularity/rating/release-date sorting where local data supports it, All/Trending/Now Showing/Coming Soon/Recent Releases/Older Films/Classic discovery categories, result count, Clear Filters, and incremental local pagination. Keep category, year, search, genre and language behavior consistent, preserve existing route navigation, and label the actual local-demo collection clearly.
- Any newly selectable location must not display theatre availability unless the local demo has venues and shows seeded for that location. Until more venue data exists, make the Belagavi-only sample limitation explicit and avoid inventing live venues or inventory.
- Keep ticket information truthful: local booking IDs and prices are demo data; the current decorative QR pattern is non-scannable and must never be presented as an entry credential. The text brief references a third ticket screenshot, but no such screenshot was attached, so do not claim to have matched it.
- Preserve all existing routes and checkout/localStorage bookings. Update `public/manus-routes.json` if new page routes are added. Recheck keyboard access, reduced-motion behavior, current booking flow, and responsive layout at 1440, 1280, 768 and 375 pixels; run typecheck/build before completing the follow-up.

**Verification evidence:** `pnpm typecheck`, `pnpm build`, and `git diff --check` pass. Automated Chromium checks verify that invalid-but-parseable preference/booking/draft storage recovers safely; saved demo preferences persist and update recommendations; unsupported-city show previews never invent venues; Explore filters and clear reset work; all 12 local movie-detail routes and all three TMDB-verified cast images load; the poster transition opens the matching detail; a demo booking completes and persists; the ticket shows selected seats, subtotal, convenience fee, demo total, runtime/language and a non-scannable-code disclosure. The full flow and profile/Explore routes were checked at 1440, 1280, 768 and 375 px with no overflow, page errors, or console errors; reduced-motion behavior was also checked.

# MOVIELANCHE migration handoff

## What is included

- New managed Webdev project: `MOVIELANCHE` in the `movielanche-new` working copy.
- Migrated React + TypeScript + Vite frontend with the existing local-demo route flow:
  `/`, `/movies`, `/movies/:id`, `/shows/:movieId`, `/seats/:showId`, `/checkout`, `/booking-confirmation`, `/bookings`, and `/profile`.
- Frontend-only boundary preserved: fixture-based catalogue/show data, browser-local demo bookings, no real login, no live inventory, no server-backed booking, and no payment processing.
- Recovered **58 TMDB-backed poster, backdrop, and verified cast-image files** into `public/legacy-assets/` so the new project renders without depending on the previous project’s storage namespace. Credits remain in `ASSET_CREDITS.md`.

## Screenshot-inspired animated ticket

The successful demo booking now renders a movie-specific ticket with:

- a backdrop strip based on the selected movie,
- red/deep-red ticket surface and perforated stub,
- poster thumbnail, booking metadata, total, demo booking ID, decorative QR pattern, and decorative barcode,
- a staged reveal: ticket rises into place with perspective, backdrop resolves with a cinematic push, copy arrives in short staggered groups, and a barcode reveal follows the ticket motion,
- responsive mobile layout and print-safe behavior.

## Interactive seat selection

The seat step now includes a clearer cinema-room map and faster selection controls:

- numbered seats with a center aisle, front-of-house screen curve, premium/standard row zones, and mirrored row labels,
- keyboard-friendly seat buttons with explicit available, selected, and occupied labels,
- live selected-seat chips that can be removed directly from the strip,
- **Best available** selection that prioritises the central viewing zone while respecting occupied seats and the six-seat limit,
- **Clear** selection control and a live count of seats selected,
- responsive map sizing for mobile screens without horizontal overflow.

Primary seat-flow files:

- `src/pages/SeatSelection.tsx`
- `src/components/SeatGrid.tsx`
- `src/index.css`

## Dashboard refinement

The home dashboard now follows the supplied streaming-reference direction more closely while staying original to MOVIELANCHE:

- added a three-card overview row for Now Showing, Coming Next, and Your Tickets,
- softened square surfaces with restrained 8–18px corner radii rather than pill-shaped UI,
- added lift, border, shadow, and arrow-hover states to dashboard cards, movie posters, and benefit cards,
- added staggered dashboard entrance motion and a reduced-motion fallback,
- kept the cinematic black/red palette, dense rail layout, and readable mobile stacking.

## First-run onboarding flow

The app now opens with a four-step cinematic setup before the dashboard:

- a browser-only demo authentication page with email, Google-style demo access, or guest continuation,
- a visual multi-select genre screen that writes into the existing local preference model,
- a city selector with an explicit browser geolocation permission action and Belagavi fallback,
- a nearby-theatre reveal using the seeded local theatre fixtures before entering the dashboard.

The intro ident is now 6.2 seconds long, with a slower red-light logo build, wordmark glint, and longer hold before the first-run flow begins. No real credentials, geolocation coordinates, or account data are sent to a server.

Primary onboarding files:

- `src/pages/AuthPage.tsx`
- `src/pages/GenreSelect.tsx`
- `src/pages/LocationSelect.tsx`
- `src/pages/NearbyTheatres.tsx`
- `src/components/OnboardingGate.tsx`
- `src/utils/onboarding.ts`

## Dashboard usability refinement

- reduced and repositioned the Interstellar hero artwork so the featured visual fits within the viewport instead of feeling over-zoomed,
- replaced the earlier Interstellar artwork with a cleaner vertical poster and a wide, dark-left hero backdrop that leaves the dashboard copy readable,
- tightened hero typography and vertical rhythm while preserving the cinematic composition,
- added a visible desktop/mobile-friendly **Log out** control in the navigation,
- logout clears only demo auth/session keys and preserves the user’s local movie preferences for a smoother return.

Primary implementation files:

- `src/components/TicketCard.tsx`
- `src/services/api.ts`
- `src/types/booking.ts`
- `src/index.css`

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

The session preview is currently running at `http://127.0.0.1:3000`.

## Validation

```bash
npm run typecheck
npm run build
```

Both completed successfully after the migration and ticket enhancement.

## Git / checkpoint note

The working copy contains local Managed Git commits `a2e0bfac791adf87fd51aeec5df883b991d6712d` and `205a2663496ac564ff5eb8945bead20825c10976`. The Local First host did not inject the temporary `manus` remote during this session, so the platform checkpoint receipt remained `unchanged`; the files and local commits are preserved in the project directory for the next checkpoint sync.

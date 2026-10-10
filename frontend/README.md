# MOVIELANCHE — Cinematic React Experience

A from-scratch React + Vite starter with a pinned, scroll-controlled cinema entrance and a demo movie discovery homepage.

## Requirements
- Node.js 18+ (Node.js 20 LTS recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Production build
```bash
npm run build
npm run preview
```

## Theatre image
The opening image is loaded from:
`public/images/movielanche-theatre.png`

Replace that file with another image using the same filename to keep the animation code unchanged. The camera movement uses the full image because the supplied theatre image is a flattened image rather than separate layers.

## How the transition works
`src/App.jsx` creates a GSAP timeline and connects it to ScrollTrigger. The entire cinematic section is pinned for a long scroll distance (`end: "+=3800"`), with `scrub: 0.7` tying the zoom and screen glow to scroll progress. The homepage wrapper is initially hidden, fixed to the viewport, and layered behind the theatre scene so it is already centered rather than sitting below the pinned section. Only after the screen has expanded beyond the viewport does the theatre fade and the homepage reveal animate from a slightly scaled, blurred state to full clarity—without a vertical slide. At the end of the pinned sequence it is handed into normal document flow at the current scroll position; reverse scrolling restores the centered overlay. GSAP context cleanup handles React Strict Mode/unmounting.

The homepage uses illustrative CSS poster artwork and placeholder interactions; there is no backend, real booking, authentication, or movie-data integration. For `prefers-reduced-motion`, the pinned transition is bypassed and an explicit Enter link is shown.

## Notes
- The timeline uses a single flattened image, so depth is simulated rather than true 3D camera tracking.
- Google Fonts are loaded from the web; system fallbacks are provided.
- ScrollTrigger's responsive pinning should be tested on target devices before deployment.

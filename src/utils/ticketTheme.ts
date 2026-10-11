export interface TicketTheme {
  /** Main card colour (top-left of the gradient). */
  primary: string;
  /** Deep shade for the bottom of the card. */
  deep: string;
  /** Highlight colour for chips, stars and the camera mark. */
  accent: string;
  /** Light tint used by the header band. */
  tint: string;
}

// Each film gets a colour drawn from its poster so the ticket feels like that movie.
const themes: Record<string, TicketTheme> = {
  interstellar: { primary: '#14606b', deep: '#06222a', accent: '#ffb454', tint: '#dcecef' },
  inception: { primary: '#3b5873', deep: '#101c29', accent: '#9ad0f5', tint: '#e4ecf2' },
  'dune-part-two': { primary: '#c28a2c', deep: '#4d3208', accent: '#ffe39a', tint: '#f6e8c8' },
  'the-batman': { primary: '#2d2d38', deep: '#0a0a0e', accent: '#ffd028', tint: '#ece4bd' },
  'across-the-spider-verse': { primary: '#b0208f', deep: '#2b1070', accent: '#3de0ff', tint: '#f1dff7' },
  oppenheimer: { primary: '#c2410c', deep: '#3a1204', accent: '#ffb27a', tint: '#f6dcc7' },
  'everything-everywhere': { primary: '#0f8f86', deep: '#052e2b', accent: '#ff9ad5', tint: '#d9f2ee' },
  barbie: { primary: '#e0218a', deep: '#7a0f4d', accent: '#ffd3ec', tint: '#fde2f1' },
  'top-gun-maverick': { primary: '#1e4fa8', deep: '#0a1a3d', accent: '#ffc23d', tint: '#e1e9f7' },
  kantara: { primary: '#2e6b45', deep: '#0b2316', accent: '#ffb347', tint: '#e2eedd' },
  'kgf-chapter-two': { primary: '#8a6a12', deep: '#17110a', accent: '#ffd54a', tint: '#f3e6b8' },
  jawan: { primary: '#c0262d', deep: '#4a0a0f', accent: '#ffd9d2', tint: '#f7dcd8' },
};

function hueFromId(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

/** Known films use their hand-picked palette; any new title gets a stable colour generated from its id. */
export function getTicketTheme(movieId: string): TicketTheme {
  const known = themes[movieId];
  if (known) return known;
  const hue = hueFromId(movieId);
  return { primary: `hsl(${hue} 62% 38%)`, deep: `hsl(${hue} 66% 12%)`, accent: `hsl(${(hue + 30) % 360} 95% 72%)`, tint: `hsl(${hue} 55% 90%)` };
}

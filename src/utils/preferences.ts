import type { Genre, Language } from '../types/movie';

export type DiscoveryPreference =
  | 'latest'
  | 'trending'
  | 'popular'
  | 'top-rated'
  | 'regional'
  | 'international'
  | 'classics'
  | 'family'
  | 'balanced';

export interface DemoPreferences {
  displayName: string;
  city: string;
  languages: Language[];
  genres: Genre[];
  discovery: DiscoveryPreference[];
}

export const PREFERENCES_KEY = 'movielanche:demo-preferences';
export const PREFERENCES_CHANGED = 'movielanche:preferences-changed';
export const DEFAULT_PREFERENCES: DemoPreferences = {
  displayName: '',
  city: 'Belagavi',
  languages: [],
  genres: [],
  discovery: [],
};

export const DEMO_CITIES = ['Belagavi', 'Bengaluru', 'Mumbai'] as const;
export const PREFERENCE_LANGUAGES: Language[] = ['Kannada', 'Hindi', 'English', 'Telugu', 'Tamil', 'Malayalam'];
export const PREFERENCE_GENRES: Genre[] = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance',
  'Sci-Fi', 'Fantasy', 'Animation', 'Crime', 'Mystery', 'History', 'Family', 'Documentary', 'Musical',
];
export const DISCOVERY_OPTIONS: Array<{ id: DiscoveryPreference; label: string }> = [
  { id: 'latest', label: 'Latest releases' },
  { id: 'trending', label: 'Trending films' },
  { id: 'popular', label: 'Popular favourites' },
  { id: 'top-rated', label: 'Higher-rated films' },
  { id: 'regional', label: 'Regional cinema' },
  { id: 'international', label: 'International cinema' },
  { id: 'classics', label: 'Older classics' },
  { id: 'family', label: 'Family-friendly picks' },
  { id: 'balanced', label: 'A balanced mix' },
];

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDemoPreferences(): DemoPreferences {
  const raw = safeRead<unknown>(PREFERENCES_KEY, null);
  const saved: Partial<DemoPreferences> = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<DemoPreferences>
    : {};
  const validLanguages = new Set<string>(PREFERENCE_LANGUAGES);
  const validGenres = new Set<string>(PREFERENCE_GENRES);
  const validDiscovery = new Set<string>(DISCOVERY_OPTIONS.map((option) => option.id));

  return {
    displayName: typeof saved.displayName === 'string' ? saved.displayName.slice(0, 32) : DEFAULT_PREFERENCES.displayName,
    city: typeof saved.city === 'string' && DEMO_CITIES.includes(saved.city as typeof DEMO_CITIES[number])
      ? saved.city
      : DEFAULT_PREFERENCES.city,
    languages: Array.isArray(saved.languages) ? saved.languages.filter((value): value is Language => validLanguages.has(value)) : [],
    genres: Array.isArray(saved.genres) ? saved.genres.filter((value): value is Genre => validGenres.has(value)) : [],
    discovery: Array.isArray(saved.discovery) ? saved.discovery.filter((value): value is DiscoveryPreference => validDiscovery.has(value)) : [],
  };
}

export function saveDemoPreferences(preferences: DemoPreferences): boolean {
  const cleaned: DemoPreferences = {
    displayName: preferences.displayName.trim().slice(0, 32),
    city: DEMO_CITIES.includes(preferences.city as typeof DEMO_CITIES[number]) ? preferences.city : 'Belagavi',
    languages: [...new Set(preferences.languages)],
    genres: [...new Set(preferences.genres)],
    discovery: [...new Set(preferences.discovery)],
  };
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new Event(PREFERENCES_CHANGED));
    return true;
  } catch {
    return false;
  }
}

export function hasPersonalPreferences(preferences: DemoPreferences): boolean {
  return preferences.languages.length > 0 || preferences.genres.length > 0 || preferences.discovery.length > 0;
}

import type { Movie } from '../types/movie';
import type { DemoPreferences } from './preferences';

/** Orders the fixture collection by explicit metadata matches; it is not a trained or live recommender. */
export function rankDemoRecommendations(movies: Movie[], preferences: DemoPreferences): Movie[] {
  return [...movies].sort((first, second) => score(second, preferences) - score(first, preferences)
    || second.rating - first.rating
    || first.title.localeCompare(second.title));
}

export function scoreDemoMovie(movie: Movie, preferences: DemoPreferences): number {
  return score(movie, preferences);
}

function score(movie: Movie, preferences: DemoPreferences): number {
  const year = Number(movie.releaseDate.slice(0, 4));
  const currentYear = new Date().getFullYear();
  let result = 0;

  result += preferences.genres.filter((genre) => movie.genres.includes(genre)).length * 4;
  if (preferences.languages.includes(movie.language)) result += 3;
  if (preferences.discovery.includes('latest') && year >= currentYear - 5) result += 2;
  if (preferences.discovery.includes('trending') && movie.rating >= 8) result += 2;
  if (preferences.discovery.includes('popular') && movie.rating >= 7.5) result += 1;
  if (preferences.discovery.includes('top-rated') && movie.rating >= 8) result += 2;
  if (preferences.discovery.includes('regional') && movie.language !== 'English') result += 2;
  if (preferences.discovery.includes('international') && movie.language === 'English') result += 1;
  if (preferences.discovery.includes('classics') && year < 2000) result += 3;
  if (preferences.discovery.includes('family') && movie.genres.some((genre) => ['Animation', 'Comedy', 'Adventure', 'Fantasy'].includes(genre))) result += 1;
  if (preferences.discovery.includes('balanced')) result += Math.max(0, movie.rating - 7) * 0.25;

  return result;
}

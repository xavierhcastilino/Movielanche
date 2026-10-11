import type { MouseEvent } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { ImageWithFallback } from './ImageWithFallback';
import { useMovieTransition } from './MovieTransition';

interface MovieCardProps {
  movie: Movie;
  compact?: boolean;
  /** Optional position badge, used by ranked rows such as Trending. */
  rank?: number;
}

export function MovieCard({ movie, compact = false, rank }: MovieCardProps) {
  const canBook = movie.status === 'now-showing';
  const { startMovieTransition } = useMovieTransition();
  const handlePosterClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    startMovieTransition(movie, `/movies/${movie.id}`, { left, top, width, height });
  };

  return (
    <article className={`movie-card ${compact ? 'movie-card--compact' : ''}`}>
      <div className="movie-card__poster">
        <Link to={`/movies/${movie.id}`} onClick={handlePosterClick} className="movie-card__poster-link" aria-label={`Open ${movie.title} details with cinematic transition`}>
          <ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} className="movie-card__image" />
          <span className="movie-card__rating"><Star size={13} fill="currentColor" aria-hidden="true" /> {movie.rating.toFixed(1)}</span>
          <span className="movie-card__overlay" aria-hidden="true" />
          {rank !== undefined && <span className={rank === 1 ? 'movie-card__rank movie-card__rank--first' : 'movie-card__rank'} aria-label={`Rank ${rank}`}>#{rank}</span>}
        </Link>
        {canBook ? <Link className="movie-card__book" to={`/shows/${movie.id}`}>Book tickets <ArrowUpRight size={14} aria-hidden="true" /></Link> : <span className="movie-card__book movie-card__book--disabled">Coming soon</span>}
      </div>
      <div className="movie-card__details">
        <div className="movie-card__title-row">
          <Link to={`/movies/${movie.id}`} className="movie-card__title">{movie.title}</Link>
          <span className="movie-card__year">{new Date(movie.releaseDate).getFullYear()}</span>
        </div>
        <p className="movie-card__meta">{movie.genres.slice(0, 2).join(' · ')} <span aria-hidden="true">/</span> {movie.language}</p>
        <Link className="movie-card__view-details" to={`/movies/${movie.id}`}>View details <ArrowUpRight size={12} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

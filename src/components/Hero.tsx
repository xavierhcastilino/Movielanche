import { useEffect, useState } from 'react';
import { Info, Star, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { ImageWithFallback } from './ImageWithFallback';

interface HeroProps {
  movies: Movie[];
  city: string;
}

const SLIDE_MS = 8000;

export function Hero({ movies, city }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = movies.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured films"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {movies.map((movie, slideIndex) => {
        const active = slideIndex === index;
        return (
          <div key={movie.id} className={active ? 'hero__slide is-active' : 'hero__slide'} aria-hidden={!active} aria-roledescription="slide" aria-label={`${slideIndex + 1} of ${count}`}>
            <ImageWithFallback src={movie.backdrop} alt={`${movie.title} backdrop`} className="hero__backdrop" loading={slideIndex === 0 ? 'eager' : 'lazy'} />
            <div className="hero__content page-wrap">
              <div className="hero__copy">
                <p className="hero__location"><span className="status-dot" /> Now showing in {city}</p>
                <h1>{movie.title}</h1>
                <div className="hero__tags">
                  <span className="hero__rating"><Star size={14} fill="currentColor" aria-hidden="true" /> {movie.rating.toFixed(1)}</span>
                  <span>{new Date(movie.releaseDate).getFullYear()}</span>
                  <span>{movie.duration}</span>
                  <span>{movie.genres.slice(0, 3).join(', ')}</span>
                </div>
                <p className="hero__description">{movie.description}</p>
                <div className="hero__actions">
                  <Link className="button button--primary" to={`/shows/${movie.id}`}><Ticket size={17} aria-hidden="true" /> Book tickets</Link>
                  <Link className="button button--glass" to={`/movies/${movie.id}`}><Info size={17} aria-hidden="true" /> More info</Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {count > 1 && (
        <div className="hero__controls page-wrap">
          <div className="hero__dots" role="group" aria-label="Choose featured film">
            {movies.map((movie, dotIndex) => (
              <button key={movie.id} type="button" className={dotIndex === index ? 'hero__dot is-active' : 'hero__dot'} aria-label={`Show ${movie.title}`} aria-pressed={dotIndex === index} onClick={() => setIndex(dotIndex)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

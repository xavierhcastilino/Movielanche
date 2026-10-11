import { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title: string;
  eyebrow?: string;
  movies: Movie[];
  seeAll?: boolean;
}

export function MovieRow({ title, eyebrow, movies, seeAll = true }: MovieRowProps) {
  const railRef = useRef<HTMLDivElement>(null);
  if (movies.length === 0) return null;

  const moveRail = (direction: -1 | 1) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: direction * railRef.current.clientWidth * 0.72, behavior: 'smooth' });
  };

  return (
    <section className="movie-row" aria-label={title}>
      <div className="section-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        <div className="section-heading__actions">
          {seeAll && <Link to="/movies" className="text-link">See all <ArrowRight size={15} aria-hidden="true" /></Link>}
          <div className="rail-controls">
            <button type="button" onClick={() => moveRail(-1)} aria-label={`Scroll ${title} left`}><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => moveRail(1)} aria-label={`Scroll ${title} right`}><ChevronRight size={17} /></button>
          </div>
        </div>
      </div>
      <div className="movie-row__rail" ref={railRef}>
        {movies.map((movie) => <MovieCard key={movie.id} movie={movie} compact />)}
      </div>
    </section>
  );
}

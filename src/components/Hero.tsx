import { ArrowDown, ArrowRight, Play, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { ImageWithFallback } from './ImageWithFallback';

interface HeroProps {
  movie: Movie;
}

export function Hero({ movie }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <ImageWithFallback src={movie.backdrop} alt={`${movie.title} backdrop`} className="hero__backdrop" loading="eager" />
      <div className="hero__shade" />
      <div className="hero__content page-wrap">
        <div className="hero__copy">
          <p className="eyebrow"><span className="status-dot" /> Featured in Belagavi <span className="hero__separator">/</span> MOVIELANCHE EDITION</p>
          <p className="hero__pretitle">THE NEXT BLOCKBUSTER</p>
          <h1 id="hero-title">IS ABOUT<br /><span>TO HIT.</span></h1>
          <p className="hero__description">Find the film that stays with you. Discover local shows, plan your seats and keep the whole night in one place.</p>
          <div className="hero__meta">
            <span><Star size={14} fill="currentColor" aria-hidden="true" /> {movie.rating.toFixed(1)}</span>
            <span>{movie.genres.slice(0, 2).join(' · ')}</span>
            <span>{movie.duration}</span>
          </div>
          <div className="hero__actions">
            <Link className="button button--primary" to="/movies">Explore movies <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="button button--secondary" to={`/shows/${movie.id}`}><Play size={15} aria-hidden="true" /> View showtimes</Link>
          </div>
        </div>
        <div className="hero__film-mark" aria-hidden="true">
          <span>ML</span><i /><i /><i />
        </div>
        <a href="#trending" className="hero__scroll"><ArrowDown size={14} aria-hidden="true" /> SCROLL TO DISCOVER</a>
        <div className="hero__slide-count"><span>01</span><i /><span>03</span></div>
      </div>
      <div className="hero__title-card">
        <span className="eyebrow">NOW SHOWING · FEATURED PICK</span>
        <strong>{movie.title}</strong>
      </div>
    </section>
  );
}

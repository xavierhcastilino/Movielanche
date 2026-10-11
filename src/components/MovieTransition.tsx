import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { ImageWithFallback } from './ImageWithFallback';

const NAVIGATE_AFTER_MS = 820;
const TRANSITION_END_MS = 1180;

type PosterOrigin = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
interface ActiveTransition {
  movie: Movie;
  destination: string;
  origin: PosterOrigin;
}
interface MovieTransitionContextValue {
  startMovieTransition: (movie: Movie, destination: string, origin: PosterOrigin) => void;
}

const MovieTransitionContext = createContext<MovieTransitionContextValue | null>(null);

export function MovieTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const activeRef = useRef(false);
  const [transition, setTransition] = useState<ActiveTransition | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const startMovieTransition = useCallback((movie: Movie, destination: string, origin: PosterOrigin) => {
    if (activeRef.current) return;
    activeRef.current = true;

    const nextState = { cinematicEntry: true, cinematicMovieId: movie.id };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigateRef.current(destination, { state: nextState });
      activeRef.current = false;
      return;
    }

    setTransition({ movie, destination, origin });
  }, []);

  useEffect(() => {
    if (!transition) return;

    const navigateTimer = window.setTimeout(() => {
      navigateRef.current(transition.destination, {
        state: { cinematicEntry: true, cinematicMovieId: transition.movie.id },
      });
    }, NAVIGATE_AFTER_MS);
    const finishTimer = window.setTimeout(() => {
      setTransition(null);
      activeRef.current = false;
    }, TRANSITION_END_MS);

    return () => {
      window.clearTimeout(navigateTimer);
      window.clearTimeout(finishTimer);
    };
  }, [transition]);

  const originStyle = transition ? {
    '--poster-left': `${transition.origin.left}px`,
    '--poster-top': `${transition.origin.top}px`,
    '--poster-width': `${transition.origin.width}px`,
    '--poster-height': `${transition.origin.height}px`,
  } as CSSProperties : undefined;

  return (
    <MovieTransitionContext.Provider value={{ startMovieTransition }}>
      {children}
      {transition && (
        <div className="movie-transition" role="status" aria-live="polite" aria-label={`Opening ${transition.movie.title}`}>
          <div className="movie-transition__darken" aria-hidden="true" />
          <div className="movie-transition__poster" style={originStyle} aria-hidden="true">
            <ImageWithFallback src={transition.movie.poster} alt="" className="movie-transition__poster-image" loading="eager" />
          </div>
          <svg className="movie-transition__trails" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
            <path className="movie-transition__trail movie-transition__trail--one" d="M1260 48 1060 148 884 266 700 370 520 484 344 590 160 720" />
            <path className="movie-transition__trail movie-transition__trail--two" d="M1204 152 1010 230 848 330 688 414 522 526 362 620" />
            <path className="movie-transition__web" d="M560 100 758 400 458 584M758 400 1030 336M758 400 810 90M758 400 1100 575M758 400 420 275" />
          </svg>
          <span className="movie-transition__flash" aria-hidden="true" />
          <div className="movie-transition__title" aria-hidden="true">
            <span>NOW OPENING</span>
            <strong>{transition.movie.title}</strong>
          </div>
        </div>
      )}
    </MovieTransitionContext.Provider>
  );
}

export function useMovieTransition() {
  const context = useContext(MovieTransitionContext);
  if (!context) throw new Error('useMovieTransition must be used inside MovieTransitionProvider.');
  return context;
}

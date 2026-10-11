import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Clapperboard, MapPin, SlidersHorizontal, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Hero } from '../components/Hero';
import { LoadingState } from '../components/LoadingState';
import { MovieRow } from '../components/MovieRow';
import { getMovies } from '../services/api';
import { useDemoPreferences } from '../hooks/useDemoPreferences';
import { hasPersonalPreferences } from '../utils/preferences';
import { rankDemoRecommendations } from '../utils/recommendations';
import type { Movie } from '../types/movie';

export function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const preferences = useDemoPreferences();

  useEffect(() => { getMovies().then(setMovies).finally(() => setLoading(false)); }, []);

  const nowShowing = movies.filter((movie) => movie.status === 'now-showing');
  const heroMovies = useMemo(() => {
    const lead = movies.find((movie) => movie.id === 'interstellar') ?? movies.find((movie) => movie.status === 'now-showing');
    if (!lead) return [];
    const rest = movies.filter((movie) => movie.status === 'now-showing' && movie.id !== lead.id).sort((a, b) => b.rating - a.rating);
    return [lead, ...rest].slice(0, 4);
  }, [movies]);
  const trending = movies.filter((movie) => movie.status === 'now-showing').sort((a, b) => b.rating - a.rating).slice(0, 6);
  const comingSoon = movies.filter((movie) => movie.status === 'coming-soon');
  const personalized = hasPersonalPreferences(preferences);
  const preferenceMovies = useMemo(() => {
    if (!personalized) return [];
    return rankDemoRecommendations(movies, preferences).filter((movie) => {
      const matchesGenre = preferences.genres.some((genre) => movie.genres.includes(genre));
      const matchesLanguage = preferences.languages.includes(movie.language);
      const matchesRecent = preferences.discovery.includes('latest') && Number(movie.releaseDate.slice(0, 4)) >= new Date().getFullYear() - 5;
      const matchesOlder = preferences.discovery.includes('classics') && Number(movie.releaseDate.slice(0, 4)) < 2000;
      const matchesTaste = preferences.discovery.some((interest) => {
        if (interest === 'trending') return movie.status === 'now-showing' && movie.rating >= 8;
        if (interest === 'popular') return movie.rating >= 7.5;
        if (interest === 'top-rated') return movie.rating >= 8;
        if (interest === 'regional') return movie.language !== 'English';
        if (interest === 'international') return movie.language === 'English';
        if (interest === 'family') return movie.genres.some((genre) => ['Animation', 'Comedy', 'Adventure', 'Fantasy'].includes(genre));
        if (interest === 'balanced') return true;
        return false;
      });
      return matchesGenre || matchesLanguage || matchesRecent || matchesOlder || matchesTaste;
    }).slice(0, 6);
  }, [movies, preferences, personalized]);
  const pickedIds = new Set(preferenceMovies.map((movie) => movie.id));
  const languageMovies = personalized
    ? movies.filter((movie) => preferences.languages.includes(movie.language) && !pickedIds.has(movie.id)).slice(0, 6)
    : [];

  return (
    <>
      {heroMovies.length > 0 && <Hero movies={heroMovies} city={preferences.city} />}
      <div className="page-wrap home-content">
        <section className="home-glance" aria-label="MOVIELANCHE overview">
          <div className="home-glance__place">
            <span className="home-glance__pin"><MapPin size={19} aria-hidden="true" /></span>
            <div>
              <strong>{preferences.city}</strong>
              <small>{preferences.city !== 'Belagavi' ? 'Sample theatre data is Belagavi only' : 'Prototype listings, locally seeded'}</small>
            </div>
            <Link to="/profile" className="home-glance__change">Change</Link>
          </div>
          <Link to="/movies" className="home-glance__stat">
            <b>{loading ? '–' : nowShowing.length}</b>
            <span>Now showing</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/movies" className="home-glance__stat">
            <b>{loading ? '–' : comingSoon.length}</b>
            <span>Coming soon</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/bookings" className="home-glance__stat home-glance__stat--tickets">
            <span className="home-glance__ticket"><Ticket size={20} aria-hidden="true" /></span>
            <span>Your tickets</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </section>
        {!personalized && <section className="personalize-prompt"><span className="personalize-prompt__icon"><SlidersHorizontal size={18} /></span><div><h2>Pick what you love.</h2><p>Set local language and genre preferences for a more personal set of film picks.</p></div><Link to="/profile" className="button button--secondary">Set my preferences <ArrowRight size={15} /></Link></section>}
        {preferences.displayName && <p className="home-personal-greeting">A good night at the movies starts with you, {preferences.displayName}.</p>}
        {loading ? <LoadingState label="Gathering the next screening…" /> : movies.length === 0 ? <EmptyState title="No movies found." /> : (
          <>
            {preferenceMovies.length > 0 && <MovieRow title="Picked for you" subtitle="Based on the genres and languages you chose" movies={preferenceMovies} />}
            {languageMovies.length > 0 && <MovieRow title="Your languages" subtitle={`Films in ${preferences.languages.filter((language) => movies.some((movie) => movie.language === language)).join(', ')}`} movies={languageMovies} />}
            <div id="trending"><MovieRow title="Trending now" subtitle="Highest rated films in cinemas" movies={trending} ranked /></div>
            <MovieRow title="Coming soon" subtitle="Next on the local slate" movies={comingSoon} />
            {personalized && <p className="recommendation-disclosure">Recommendations are simple matches against the demo catalogue’s genres, languages, release years and ratings.</p>}
          </>
        )}
        <section id="about" className="benefits-section">
          <div className="section-heading benefits-section__heading">
            <h2>Why MOVIELANCHE?</h2>
            <p>Less scrolling. More settling in.</p>
          </div>
          <div className="benefit-grid">
            <article className="benefit-card"><span className="benefit-card__icon"><Ticket size={21} /></span><div><h3>Easy booking</h3><p>Choose a film, show and seats in a few clear steps.</p></div></article>
            <article className="benefit-card"><span className="benefit-card__icon"><CalendarDays size={21} /></span><div><h3>Flexible shows</h3><p>Browse Belagavi demo theatres and times in one place.</p></div></article>
            <article className="benefit-card"><span className="benefit-card__icon"><Clapperboard size={21} /></span><div><h3>Digital tickets</h3><p>Find your prototype booking again whenever you need it.</p></div></article>
          </div>
        </section>
      </div>
    </>
  );
}

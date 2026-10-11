import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, SlidersHorizontal, Ticket, MapPin } from 'lucide-react';
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

  const featured = movies.find((movie) => movie.id === 'interstellar') ?? movies.find((movie) => movie.status === 'now-showing');
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
      {featured && <Hero movie={featured} />}
      <div className="page-wrap home-content">
        <div className="home-location-strip">
          <span><MapPin size={15} aria-hidden="true" /> Curated around {preferences.city}{preferences.city !== 'Belagavi' && ' · sample theatre data is Belagavi only'}</span>
          <span className="home-location-strip__rule" />
          <span>Prototype listings · locally seeded</span>
          <Link to="/movies">Explore all films <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <section className="dashboard-glance" aria-label="MOVIELANCHE dashboard overview">
          <article className="dashboard-glance__card dashboard-glance__card--accent">
            <div><p className="eyebrow">NOW SHOWING</p><strong>{trending.length} films</strong><span>Higher-rated picks ready for tonight.</span></div>
            <Link to="/movies" aria-label="Explore now showing films"><ArrowRight size={17} /></Link>
          </article>
          <article className="dashboard-glance__card">
            <div><p className="eyebrow">COMING NEXT</p><strong>{comingSoon.length} titles</strong><span>Keep an eye on the next local slate.</span></div>
            <Link to="/movies" aria-label="Explore coming soon films"><ArrowRight size={17} /></Link>
          </article>
          <article className="dashboard-glance__card">
            <div><p className="eyebrow">YOUR TICKETS</p><strong>Plans, kept together</strong><span>Revisit saved demo bookings in one place.</span></div>
            <Link to="/bookings" aria-label="Open your bookings"><ArrowRight size={17} /></Link>
          </article>
        </section>
        {!personalized && <section className="personalize-prompt"><span className="personalize-prompt__icon"><SlidersHorizontal size={18} /></span><div><p className="eyebrow">YOUR MOVIELANCHE</p><h2>Pick what you love.</h2><p>Set local language and genre preferences for a more personal set of film picks.</p></div><Link to="/profile" className="button button--secondary">Set my preferences <ArrowRight size={15} /></Link></section>}
        {preferences.displayName && <p className="home-personal-greeting">A good night at the movies starts with you, {preferences.displayName}.</p>}
        {loading ? <LoadingState label="Gathering the next screening…" /> : movies.length === 0 ? <EmptyState title="No movies found." /> : (
          <>
            {preferenceMovies.length > 0 && <MovieRow title="Picked for you" eyebrow="LOCAL PICKS FROM YOUR CHOICES" movies={preferenceMovies} />}
            {languageMovies.length > 0 && <MovieRow title="Your languages" eyebrow={`FILMS IN ${preferences.languages.filter((language) => movies.some((movie) => movie.language === language)).join(' · ').toUpperCase()}`} movies={languageMovies} />}
            <div id="trending"><MovieRow title="Trending now" eyebrow="HIGHER-RATED LOCAL FIXTURES" movies={trending} /></div>
            <MovieRow title="Coming soon" eyebrow="UP NEXT ON THE LOCAL DEMO SLATE" movies={comingSoon} />
            {personalized && <p className="recommendation-disclosure">Recommendations are simple matches against the demo catalogue’s genres, languages, release years and ratings.</p>}
          </>
        )}
        <section id="about" className="benefits-section">
          <div className="section-heading benefits-section__heading">
            <div><p className="eyebrow">A BETTER WAY TO PLAN</p><h2>Why MOVIELANCHE?</h2></div>
            <p>Less scrolling. More settling in.</p>
          </div>
          <div className="benefit-grid">
            <article className="benefit-card"><span className="benefit-card__icon"><Ticket size={20} /></span><div><h3>Easy booking</h3><p>Choose a film, show and seats in a few clear steps.</p></div><span className="benefit-card__number">01</span></article>
            <article className="benefit-card"><span className="benefit-card__icon"><CalendarDays size={20} /></span><div><h3>Flexible shows</h3><p>Browse Belagavi demo theatres and times in one place.</p></div><span className="benefit-card__number">02</span></article>
            <article className="benefit-card"><span className="benefit-card__icon"><ArrowRight size={20} /></span><div><h3>Digital tickets</h3><p>Find your prototype booking again whenever you need it.</p></div><span className="benefit-card__number">03</span></article>
          </div>
        </section>
      </div>
    </>
  );
}

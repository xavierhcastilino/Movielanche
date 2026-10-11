import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Languages, MapPin, Play, Star, Ticket } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { TrailerModal } from '../components/TrailerModal';
import { getNextDates, createShows } from '../data/shows';
import { theatres } from '../data/theatres';
import { useDemoPreferences } from '../hooks/useDemoPreferences';
import { getMovieById } from '../services/api';
import type { Movie } from '../types/movie';

export function MovieDetails() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const preferences = useDemoPreferences();
  const transitionState = location.state as { cinematicEntry?: boolean; cinematicMovieId?: string } | null;
  const revealDetails = transitionState?.cinematicEntry === true && transitionState.cinematicMovieId === id;
  const dates = useMemo(() => getNextDates(5), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]?.iso ?? '');
  const [movie, setMovie] = useState<Movie>();
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const previewShows = useMemo(() => movie?.status === 'now-showing' ? createShows(id, selectedDate) : [], [id, movie?.status, selectedDate]);
  const cityShows = previewShows.filter((show) => show.city === preferences.city);
  const cityTheatres = theatres.filter((theatre) => theatre.city === preferences.city && cityShows.some((show) => show.theatreId === theatre.id));

  useEffect(() => { setLoading(true); getMovieById(id).then(setMovie).finally(() => setLoading(false)); }, [id]);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  if (loading) return <div className="inner-page page-wrap loading-state" role="status">Finding the film…</div>;
  if (!movie) return <div className="inner-page page-wrap"><EmptyState title="We couldn't find that film." description="Explore the collection to find your next movie." /><Link className="button button--secondary" to="/movies">Back to movies</Link></div>;

  const releaseYear = new Date(movie.releaseDate).getFullYear();
  const canBook = movie.status === 'now-showing';
  const openShowSelection = () => navigate(`/shows/${movie.id}`, { state: { dateISO: selectedDate } });

  return (
    <>
      <section className={revealDetails ? 'detail-hero detail-hero--reveal' : 'detail-hero'}>
        <ImageWithFallback src={movie.backdrop} alt={`${movie.title} backdrop`} className="detail-hero__backdrop" loading="eager" />
        <div className="detail-hero__shade" />
        <div className="page-wrap detail-hero__content">
          <Link to="/movies" className="back-link"><ArrowLeft size={15} /> All movies</Link>
          <div className="detail-hero__body">
            <ImageWithFallback src={movie.poster} alt={`${movie.title} theatrical poster`} className="detail-hero__poster" loading="eager" />
            <div className="detail-hero__info">
              <span className="eyebrow"><span className="status-dot" /> {canBook ? 'NOW SHOWING' : 'COMING SOON'} · {releaseYear}</span>
              <h1>{movie.title}<span className="heading-period">.</span></h1>
              <div className="detail-meta">
                <span className="detail-rating"><Star size={15} fill="currentColor" /> {movie.rating.toFixed(1)} <small>/ 10</small></span>
                <span>{movie.genres.join(' · ')}</span>
                <span><Clock3 size={15} /> {movie.duration}</span>
              </div>
              <div className="detail-meta detail-meta--secondary"><span><Languages size={15} /> {movie.language}</span><span><CalendarDays size={15} /> {new Date(`${movie.releaseDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              <p className="detail-hero__description">{movie.description}</p>
              <div className="detail-hero__actions">
                {canBook ? <Link className="button button--primary" to={`/shows/${movie.id}`} state={{ dateISO: selectedDate }}><Ticket size={17} /> Book tickets</Link> : <button className="button button--primary" type="button" disabled><Ticket size={17} /> Coming soon</button>}
                <button className="button button--light-outline" type="button" onClick={() => setTrailerOpen(true)} disabled={!movie.trailerUrl} title={!movie.trailerUrl ? 'No trailer is available in the demo catalogue' : undefined}><Play size={15} /> {movie.trailerUrl ? 'Watch trailer' : 'Trailer unavailable'}</button>
              </div>
              <p className="prototype-note detail-hero__disclosure">Show listings are sample data for {preferences.city}; only Belagavi theatres are seeded in this frontend prototype.</p>
            </div>
          </div>
        </div>
        <span className="detail-hero__film-number" aria-hidden="true">ML / {String(movie.id.length).padStart(2, '0')}</span>
      </section>
      <div className={revealDetails ? 'page-wrap detail-content detail-content--reveal' : 'page-wrap detail-content'}>
        <section className="detail-about">
          <div><p className="eyebrow">THE STORY</p><h2>About the movie</h2></div>
          <p>{movie.description} Settle in for {movie.duration} of {movie.genres.slice(0, 2).join(' and ').toLowerCase()} in {movie.language}.</p>
        </section>
        <section className="cast-section">
          <div className="section-heading"><div><p className="eyebrow">THE PEOPLE BEHIND IT</p><h2>Cast</h2></div></div>
          <div className="cast-row">{movie.cast.map((member) => <article className="cast-card" key={member.name}><div className="cast-card__portrait">{member.image ? <ImageWithFallback src={member.image} alt={member.name} /> : <span>{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>}</div><strong>{member.name}</strong><small>{member.character}</small></article>)}</div>
        </section>
        <section className="details-shows-preview">
          <div className="details-shows-preview__copy"><p className="eyebrow">YOUR NEAREST SCREENING</p><h2>Choose your show</h2><p>{canBook ? `Preview seeded ${preferences.city} dates and sample times, then continue to the full show list to choose a theatre and format.` : 'This title is coming soon. Demo ticket booking will open when sample showtimes are added.'}</p>{canBook && <button className="text-link details-show-all" type="button" onClick={openShowSelection}>Browse all theatres & times <ArrowRight size={15} /></button>}</div>
          <div className="details-shows-preview__content">
            {canBook ? <>
              <div className="details-date-selector" role="group" aria-label="Preview show date">
                {dates.map((date) => <button key={date.iso} type="button" className={selectedDate === date.iso ? 'details-date is-active' : 'details-date'} aria-pressed={selectedDate === date.iso} onClick={() => setSelectedDate(date.iso)}><span>{date.label}</span><strong>{date.day}</strong><small>{new Date(`${date.iso}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</small></button>)}
              </div>
              {cityTheatres.length ? <div className="details-show-venues">{cityTheatres.map((theatre, index) => {
                const times = cityShows.filter((show) => show.theatreId === theatre.id && show.status !== 'sold-out').slice(0, 2);
                return <div className="details-show-venue" key={theatre.id}><span className="venue-number">0{index + 1}</span><div><strong>{theatre.name}</strong><small><MapPin size={12} /> {theatre.area}, {theatre.city} · {theatre.formats.join(' / ')}</small><div className="details-show-venue__times">{times.map((show) => <span key={show.id}><Clock3 size={11} /> {show.time}</span>)}</div></div></div>;
              })}</div> : <div className="details-no-shows"><span>NO LOCAL DEMO VENUES</span><p>Only Belagavi has seeded theatre and show data. Change the demo city in Preferences to preview its listings.</p></div>}
            </> : <div className="details-no-shows"><span>NOT OPEN YET</span><p>No sample showtimes are available for this film.</p></div>}
          </div>
        </section>
      </div>
      {trailerOpen && <TrailerModal title={movie.title} videoUrl={movie.trailerUrl} onClose={closeTrailer} />}
    </>
  );
}

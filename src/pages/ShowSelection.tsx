import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, Info, MapPin, Star } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { LoadingState } from '../components/LoadingState';
import { SeatCountSheet } from '../components/SeatCountSheet';
import { TheatreCard } from '../components/TheatreCard';
import { getNextDates, type MovieShow } from '../data/shows';
import { theatres } from '../data/theatres';
import { getMovieById, getShows } from '../services/api';
import { saveBookingDraft } from '../utils/booking';
import { useDemoPreferences } from '../hooks/useDemoPreferences';
import type { Movie } from '../types/movie';

interface ShowPageState { dateISO?: string }

export function ShowSelection() {
  const { movieId = '' } = useParams();
  const location = useLocation();
  const initialDateISO = (location.state as ShowPageState | null)?.dateISO;
  const navigate = useNavigate();
  const preferences = useDemoPreferences();
  const dates = useMemo(() => getNextDates(5), []);
  const [selectedDate, setSelectedDate] = useState(() => dates.some((date) => date.iso === initialDateISO) ? initialDateISO! : dates[0]?.iso ?? '');
  const [movie, setMovie] = useState<Movie>();
  const [movieLoading, setMovieLoading] = useState(true);
  const [shows, setShows] = useState<MovieShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingShow, setPendingShow] = useState<MovieShow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formatFilter, setFormatFilter] = useState('all');

  const cityShows = shows.filter((show) => show.city === preferences.city);
  const formatOptions = useMemo(() => Array.from(new Set(cityShows.map((show) => show.format))), [cityShows]);
  const activeFormat = formatOptions.includes(formatFilter) ? formatFilter : 'all';
  const visibleShows = activeFormat === 'all' ? cityShows : cityShows.filter((show) => show.format === activeFormat);
  const cityTheatres = theatres.filter((theatre) => theatre.city === preferences.city && visibleShows.some((show) => show.theatreId === theatre.id));
  const nearestId = useMemo(() => theatres
    .filter((theatre) => theatre.city === preferences.city)
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))[0]?.id, [preferences.city]);

  useEffect(() => { setMovieLoading(true); getMovieById(movieId).then(setMovie).finally(() => setMovieLoading(false)); }, [movieId]);
  useEffect(() => {
    setLoading(true);
    getShows(movieId, selectedDate).then(setShows).finally(() => setLoading(false));
  }, [movieId, selectedDate]);

  const chooseShow = (show: MovieShow) => { setPendingShow(show); setSheetOpen(true); };

  const confirmSeatCount = (seatCount: number) => {
    const show = pendingShow;
    if (!show) return;
    saveBookingDraft({
      movieId: show.movieId, showId: show.id, theatreId: show.theatreId,
      theatreName: show.theatreName, theatreArea: show.area, city: show.city,
      distance: show.distance, dateISO: show.dateISO, dateLabel: show.dateLabel,
      time: show.time, format: show.format, screen: show.screen,
      ticketPrice: show.ticketPrice, seats: [], seatCount,
    });
    navigate(`/seats/${show.id}`);
  };

  if (movieLoading) return <div className="page-wrap inner-page"><LoadingState label="Loading movie and sample showtimes…" /></div>;
  if (!movie) return <div className="page-wrap inner-page"><EmptyState title="Movie not found." description="Return to the movie collection and choose a film." /><Link to="/movies" className="button button--secondary">Explore movies</Link></div>;

  const dateChips = dates.map((date, index) => {
    const value = new Date(`${date.iso}T12:00:00`);
    return {
      iso: date.iso,
      top: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : value.toLocaleDateString('en-IN', { weekday: 'short' }),
      day: value.toLocaleDateString('en-IN', { day: '2-digit' }),
      month: value.toLocaleDateString('en-IN', { month: 'short' }),
    };
  });

  return (
    <div className="page-wrap inner-page show-selection-page">
      <Link to={`/movies/${movie.id}`} className="back-link"><ArrowLeft size={15} /> Movie details</Link>
      <header className="show-hero">
        <ImageWithFallback src={movie.backdrop} alt={`${movie.title} backdrop`} className="show-hero__backdrop" loading="eager" />
        <div className="show-hero__inner">
          <ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} className="show-hero__poster" loading="eager" />
          <div className="show-hero__copy">
            <p className="show-hero__kicker">Book tickets</p>
            <h1>{movie.title}<span className="sr-only"> — choose your show</span></h1>
            <div className="show-hero__meta">
              <span className="show-hero__rating"><Star size={13} fill="currentColor" aria-hidden="true" /> {movie.rating.toFixed(1)}</span>
              <span><Clock size={13} aria-hidden="true" /> {movie.duration}</span>
              <span>{movie.language}</span>
              <span>{movie.genres.slice(0, 2).join(', ')}</span>
            </div>
          </div>
          <span className="show-hero__city"><MapPin size={14} aria-hidden="true" /> {preferences.city}</span>
        </div>
      </header>

      <div className="show-toolbar">
        <div className="date-strip" role="group" aria-label="Select show date">
          {dateChips.map((chip) => (
            <button key={chip.iso} type="button" className={selectedDate === chip.iso ? 'date-chip is-active' : 'date-chip'} aria-pressed={selectedDate === chip.iso} onClick={() => setSelectedDate(chip.iso)}>
              <span>{chip.top}</span><strong>{chip.day}</strong><small>{chip.month}</small>
            </button>
          ))}
        </div>
        {formatOptions.length > 1 && (
          <div className="format-filter" role="group" aria-label="Filter by format">
            <button type="button" className={activeFormat === 'all' ? 'format-chip is-active' : 'format-chip'} aria-pressed={activeFormat === 'all'} onClick={() => setFormatFilter('all')}>All formats</button>
            {formatOptions.map((format) => <button key={format} type="button" className={activeFormat === format ? 'format-chip is-active' : 'format-chip'} aria-pressed={activeFormat === format} onClick={() => setFormatFilter(format)}>{format}</button>)}
          </div>
        )}
      </div>

      <section className="show-list" aria-label="Theatres and showtimes">
        <div className="show-list__head">
          <h2>{loading || cityTheatres.length === 0 ? 'Theatres and showtimes' : `${cityTheatres.length} ${cityTheatres.length === 1 ? 'theatre' : 'theatres'} in ${preferences.city}`}</h2>
          <ul className="status-legend" aria-label="Showtime colours">
            <li><i className="status-legend__dot status-legend__dot--available" /> Available</li>
            <li><i className="status-legend__dot status-legend__dot--fast-filling" /> Filling fast</li>
            <li><i className="status-legend__dot status-legend__dot--sold-out" /> Sold out</li>
          </ul>
        </div>
        <p className="prototype-banner"><Info size={14} aria-hidden="true" /> Theatres, times and seat availability below are seeded demo data, not a live cinema feed.</p>
        {loading ? <LoadingState label="Loading sample showtimes…" /> : movie.status === 'coming-soon' ? <EmptyState title="This film is coming soon." description="There are no demo showtimes for this title yet. Choose a now-showing film to continue." /> : cityShows.length === 0 ? <><EmptyState title={`No sample theatres in ${preferences.city}.`} description="The only seeded demo theatre and show listings are for Belagavi." /><Link className="text-link" to="/profile">Switch to the Belagavi demo location <ArrowRight size={14} /></Link></> : cityTheatres.map((theatre) => {
          const theatreShows = visibleShows.filter((show) => show.theatreId === theatre.id);
          return <TheatreCard key={theatre.id} name={theatre.name} area={theatre.area} distance={theatre.distance} formats={theatre.formats} shows={theatreShows} nearest={theatre.id === nearestId && cityTheatres.length > 1} onChoose={chooseShow} />;
        })}
      </section>
      <SeatCountSheet open={sheetOpen} movieTitle={movie.title} subtitle={pendingShow ? `${pendingShow.theatreName} · ${pendingShow.dateLabel} · ${pendingShow.time} · ${pendingShow.format}` : ''} ticketPrice={pendingShow?.ticketPrice ?? 0} onClose={() => setSheetOpen(false)} onConfirm={confirmSeatCount} />
      <p className="show-selection-footnote"><Info size={14} aria-hidden="true" /> Sample theatre data for the MOVIELANCHE Belagavi prototype</p>
    </div>
  );
}

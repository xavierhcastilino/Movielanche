import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { LoadingState } from '../components/LoadingState';
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

  const cityShows = shows.filter((show) => show.city === preferences.city);
  const cityTheatres = theatres.filter((theatre) => theatre.city === preferences.city && cityShows.some((show) => show.theatreId === theatre.id));

  useEffect(() => { setMovieLoading(true); getMovieById(movieId).then(setMovie).finally(() => setMovieLoading(false)); }, [movieId]);
  useEffect(() => {
    setLoading(true);
    getShows(movieId, selectedDate).then(setShows).finally(() => setLoading(false));
  }, [movieId, selectedDate]);

  const chooseShow = (show: MovieShow) => {
    saveBookingDraft({
      movieId: show.movieId, showId: show.id, theatreId: show.theatreId,
      theatreName: show.theatreName, theatreArea: show.area, city: show.city,
      distance: show.distance, dateISO: show.dateISO, dateLabel: show.dateLabel,
      time: show.time, format: show.format, screen: show.screen,
      ticketPrice: show.ticketPrice, seats: [],
    });
    navigate(`/seats/${show.id}`);
  };

  if (movieLoading) return <div className="page-wrap inner-page"><LoadingState label="Loading movie and sample showtimes…" /></div>;
  if (!movie) return <div className="page-wrap inner-page"><EmptyState title="Movie not found." description="Return to the movie collection and choose a film." /><Link to="/movies" className="button button--secondary">Explore movies</Link></div>;

  return (
    <div className="page-wrap inner-page show-selection-page">
      <Link to={`/movies/${movie.id}`} className="back-link"><ArrowLeft size={15} /> Movie details</Link>
      <div className="show-movie-summary">
        <ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} className="show-movie-summary__poster" />
        <div><span className="eyebrow">BOOK YOUR CINEMA NIGHT</span><h1>Choose your show<span className="heading-period">.</span></h1><p>{movie.title} <span>·</span> <MapPin size={14} /> {preferences.city}</p></div>
        <span className="show-movie-summary__tag">SAMPLE SHOW LISTINGS</span>
      </div>
      <section className="show-picker">
        <div className="section-heading"><div><p className="eyebrow">STEP 01 / DATE</p><h2>Pick a day</h2></div></div>
        <div className="date-selector" role="group" aria-label="Select show date">
          {dates.map((date, index) => <button key={date.iso} type="button" className={selectedDate === date.iso ? 'date-option is-active' : 'date-option'} aria-pressed={selectedDate === date.iso} onClick={() => setSelectedDate(date.iso)}><span>{date.label}</span><strong>{date.day}</strong><small>{new Date(`${date.iso}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</small>{index === 0 && <i />}</button>)}
        </div>
      </section>
      <section className="show-list-section">
        <div className="section-heading"><div><p className="eyebrow">STEP 02 / THEATRE & TIME</p><h2>Find a screen near you</h2></div><span className="prototype-tag"><MapPin size={13} /> {preferences.city}</span></div>
        <p className="prototype-banner">Theatres, times and seat availability below are seeded demo data, not a live cinema feed.</p>
        {loading ? <LoadingState label="Loading sample showtimes…" /> : movie.status === 'coming-soon' ? <EmptyState title="This film is coming soon." description="There are no demo showtimes for this title yet. Choose a now-showing film to continue." /> : cityShows.length === 0 ? <><EmptyState title={`No sample theatres in ${preferences.city}.`} description="The only seeded demo theatre and show listings are for Belagavi." /><Link className="text-link" to="/profile">Switch to the Belagavi demo location <ArrowRight size={14} /></Link></> : cityTheatres.map((theatre) => {
          const theatreShows = cityShows.filter((show) => show.theatreId === theatre.id);
          return <TheatreCard key={theatre.id} name={theatre.name} area={theatre.area} distance={theatre.distance} formats={theatre.formats} shows={theatreShows} onChoose={chooseShow} />;
        })}
      </section>
      <div className="show-selection-footnote">Sample theatre data for the MOVIELANCHE Belagavi prototype <ArrowRight size={14} /></div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { getMyBookings } from '../services/api';
import type { Booking } from '../types/booking';

type BookingTab = 'Upcoming' | 'Past';

export function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<BookingTab>('Upcoming');
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMyBookings().then(setBookings).finally(() => setLoading(false)); }, []);

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings.reduce<{ upcoming: Booking[]; past: Booking[] }>((groups, booking) => {
      const showDate = new Date(`${booking.dateISO}T12:00:00`);
      (showDate >= today ? groups.upcoming : groups.past).push(booking);
      return groups;
    }, { upcoming: [], past: [] });
  }, [bookings]);
  const shown = tab === 'Upcoming' ? upcoming : past;

  return (
    <div className="page-wrap inner-page bookings-page">
      <header className="page-heading page-heading--split"><div><p className="eyebrow">YOUR MOVIELANCHE WALLET</p><h1>My bookings<span className="heading-period">.</span></h1><p>Your next story, all in one place.</p></div><span className="page-heading__index">{bookings.length.toString().padStart(2, '0')} TICKETS</span></header>
      <div className="booking-tabs" role="tablist" aria-label="Booking history">
        <button type="button" role="tab" aria-selected={tab === 'Upcoming'} className={tab === 'Upcoming' ? 'booking-tab is-active' : 'booking-tab'} onClick={() => setTab('Upcoming')}>Upcoming <span>{upcoming.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'Past'} className={tab === 'Past' ? 'booking-tab is-active' : 'booking-tab'} onClick={() => setTab('Past')}>Past <span>{past.length}</span></button>
      </div>
      {loading ? <div className="loading-state" role="status">Loading your tickets…</div> : shown.length === 0 ? <div className="bookings-empty"><EmptyState title="No bookings yet." description={tab === 'Upcoming' ? 'Your next cinema night is waiting to be planned.' : 'Completed demo bookings will appear here.'} /><Link to="/movies" className="button button--primary">Find a movie <ArrowRight size={16} /></Link></div> : (
        <div className="booking-history-list">{shown.map((booking) => <article className="history-card" key={booking.id}>
          <Link className="history-card__poster-link" to={`/movies/${booking.movieId}`} aria-label={`View ${booking.movieTitle}`}><ImageWithFallback src={booking.poster} alt={`${booking.movieTitle} poster`} /></Link>
          <div className="history-card__main"><div className="history-card__title-row"><div><span className="eyebrow">{tab === 'Upcoming' ? 'UPCOMING' : 'COMPLETED'} · {booking.id}</span><h2>{booking.movieTitle}</h2></div><span className={tab === 'Upcoming' ? 'status-pill status-pill--upcoming' : 'status-pill'}>{tab === 'Upcoming' ? 'Upcoming' : 'Completed'}</span></div>
            <div className="history-card__meta"><span><MapPin size={14} /> {booking.theatreName}, {booking.theatreArea}</span><span><CalendarDays size={14} /> {new Date(`${booking.dateISO}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · {booking.time}</span><span><Ticket size={14} /> Seats {booking.seats.join(', ')}</span></div>
            <div className="history-card__bottom"><span>{booking.format} · {booking.screen}</span><Link className="text-link" to="/booking-confirmation" state={{ booking, revealTicket: false }}>View ticket <ArrowRight size={14} /></Link></div>
          </div>
        </article>)}</div>
      )}
      <p className="prototype-note bookings-disclosure">Bookings are stored in this browser only. No payment or real cinema reservation is created.</p>
    </div>
  );
}

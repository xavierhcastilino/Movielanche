import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BookingSummary } from '../components/BookingSummary';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { SeatCountSheet } from '../components/SeatCountSheet';
import { SeatGrid } from '../components/SeatGrid';
import { movies } from '../data/movies';
import { getSeats } from '../services/api';
import type { BookingDraft } from '../types/booking';
import { getBookingDraft, getSeatRows, MAX_SEATS, saveBookingDraft } from '../utils/booking';

const seatPriority = ['D4', 'D5', 'E4', 'E5', 'C4', 'C5', 'F4', 'F5', 'D3', 'D6', 'E3', 'E6'];

export function SeatSelection() {
  const { showId = '' } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft | null>(() => getBookingDraft());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => getBookingDraft()?.seats ?? []);
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSeats(showId).then((seats) => setOccupied(new Set(seats.filter((seat) => seat.state === 'occupied').map((seat) => seat.id))));
  }, [showId]);

  useEffect(() => {
    if (draft?.showId === showId) saveBookingDraft({ ...draft, seats: selected });
  }, [draft, selected, showId]);

  const allSeatIds = useMemo(() => getSeatRows().flatMap((row) => Array.from({ length: 8 }, (_, index) => `${row}${index + 1}`)), []);
  const availableSeatIds = useMemo(() => allSeatIds.filter((seatId) => !occupied.has(seatId)), [allSeatIds, occupied]);

  if (!draft || draft.showId !== showId) return <Navigate to="/movies" replace />;
  const seatLimit = draft.seatCount ?? MAX_SEATS;
  const movie = movies.find((item) => item.id === draft.movieId);
  if (!movie) return <div className="page-wrap inner-page"><EmptyState title="Movie not found." description="Please return to the movie collection." /><Link to="/movies" className="button button--secondary">Explore movies</Link></div>;

  const toggleSeat = (seatId: string) => {
    setMessage('');
    if (selected.includes(seatId)) {
      setSelected(selected.filter((seat) => seat !== seatId));
      return;
    }
    if (selected.length >= seatLimit) {
      setMessage(`You chose ${seatLimit} ${seatLimit === 1 ? 'seat' : 'seats'}. Deselect one to pick another, or change the seat count.`);
      return;
    }
    setSelected([...selected, seatId].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  };

  const changeSeatCount = (count: number) => {
    const trimmed = selected.slice(0, count);
    const next = { ...draft, seatCount: count, seats: trimmed };
    setDraft(next); setSelected(trimmed); saveBookingDraft(next); setSheetOpen(false); setMessage('');
  };

  const clearSelection = () => {
    setSelected([]);
    setMessage('');
  };

  const chooseBestAvailable = () => {
    const preferred = [...seatPriority, ...availableSeatIds].filter((seatId, index, seats) => seats.indexOf(seatId) === index && availableSeatIds.includes(seatId)).slice(0, seatLimit);
    setSelected(preferred.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    setMessage('');
  };

  const continueToCheckout = () => {
    if (selected.length !== seatLimit) {
      setMessage(`Please pick ${seatLimit - selected.length} more ${seatLimit - selected.length === 1 ? 'seat' : 'seats'} to continue.`);
      return;
    }
    saveBookingDraft({ ...draft, seats: selected });
    navigate('/checkout');
  };

  return (
    <div className="page-wrap inner-page seat-page">
      <Link to={`/shows/${draft.movieId}`} className="back-link"><ArrowLeft size={15} /> Change show</Link>
      <header className="page-heading seat-page__heading">
        <div><p className="eyebrow">STEP 03 / PICK YOUR SEATS</p><h1>Pick your seats<span className="heading-period">.</span></h1><p>Good seats make a good story even better.</p></div>
        <div className="seat-page__show-card"><ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} /><span><strong>{movie.title}</strong><small>{draft.theatreName} · {draft.dateLabel} · {draft.time}</small><small>{draft.screen} · {draft.format}</small></span></div>
      </header>
      <div className="booking-layout">
        <section className="seat-panel">
          <div className="prototype-banner"><AlertCircle size={15} /> Sample seat map for this frontend demo · availability is not live · pick the number of seats you chose.</div>
          <div className="seat-actions" aria-label="Seat map actions">
            <div><span className="eyebrow">LIVE SELECTION</span><strong aria-live="polite">{selected.length} of {seatLimit} seats selected</strong></div>
            <div className="seat-actions__buttons">
              <button className="button button--secondary button--compact" type="button" onClick={() => setSheetOpen(true)}><Pencil size={14} /> {seatLimit} {seatLimit === 1 ? 'seat' : 'seats'}</button>
              <button className="button button--secondary button--compact" type="button" onClick={chooseBestAvailable}><Sparkles size={14} /> Best available</button>
              <button className="button button--ghost button--compact" type="button" onClick={clearSelection} disabled={selected.length === 0}><RotateCcw size={14} /> Clear</button>
            </div>
          </div>
          <SeatGrid selected={selected} occupied={occupied} onToggle={toggleSeat} />
          <div className="selected-seat-strip" aria-live="polite">
            <span className="eyebrow">YOUR SEATS</span>
            {selected.length ? <div className="selected-seat-strip__list">{selected.map((seat) => <button key={seat} type="button" onClick={() => toggleSeat(seat)} aria-label={`Remove seat ${seat}`}>{seat} ×</button>)}</div> : <p>Select any available seat on the map to add it here.</p>}
          </div>
          {message && <p className="form-message" role="alert">{message}</p>}
        </section>
        <BookingSummary movieTitle={movie.title} theatreName={draft.theatreName} theatreArea={draft.theatreArea} date={draft.dateLabel} time={draft.time} format={draft.format} seats={selected} ticketPrice={draft.ticketPrice} actionLabel="Continue to checkout" disabled={selected.length !== seatLimit} onAction={continueToCheckout} />
      </div>
      <SeatCountSheet open={sheetOpen} movieTitle={movie.title} subtitle={`${draft.theatreName} · ${draft.dateLabel} · ${draft.time}`} ticketPrice={draft.ticketPrice} initialCount={seatLimit} onClose={() => setSheetOpen(false)} onConfirm={changeSeatCount} />
    </div>
  );
}

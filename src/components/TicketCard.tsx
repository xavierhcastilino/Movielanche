import type { CSSProperties } from 'react';
import { CalendarDays, Clapperboard, Film, Star } from 'lucide-react';
import type { Booking } from '../types/booking';
import { isPremiumSeat } from '../utils/booking';
import { formatCurrency } from '../utils/formatCurrency';
import { getTicketTheme } from '../utils/ticketTheme';
import { ImageWithFallback } from './ImageWithFallback';
import { QrCode } from './QrCode';

interface TicketCardProps {
  booking: Booking;
  reveal?: boolean;
}

function seatClass(seats: string[]): string {
  const premium = seats.filter(isPremiumSeat).length;
  if (premium === 0) return 'Standard';
  return premium === seats.length ? 'Premium' : 'Premium + Standard';
}

export function TicketCard({ booking, reveal = false }: TicketCardProps) {
  const theme = getTicketTheme(booking.movieId);
  const backdrop = booking.movieBackdrop || booking.poster;
  const date = new Date(`${booking.dateISO}T12:00:00`);
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
  const month = date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  const count = booking.seats.length;
  const qrValue = ['MOVIELANCHE', booking.id, booking.movieTitle, `${booking.dateISO} ${booking.time}`, `${booking.theatreName} ${booking.screen}`, booking.seats.join(',')].join('|');
  const style = { '--vt-primary': theme.primary, '--vt-deep': theme.deep, '--vt-accent': theme.accent, '--vt-tint': theme.tint } as CSSProperties;

  return (
    <article className={reveal ? 'vt vt--reveal' : 'vt'} id="printable-ticket" style={style} aria-label={`Ticket for ${booking.movieTitle}`}>
      <div className="vt__head">
        <ImageWithFallback src={backdrop} alt="" className="vt__head-image" />
        <svg className="vt__reel" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="9" fill="currentColor" />
          {[0, 60, 120, 180, 240, 300].map((angle) => <circle key={angle} cx={50 + 27 * Math.cos((angle * Math.PI) / 180)} cy={50 + 27 * Math.sin((angle * Math.PI) / 180)} r="9" fill="currentColor" />)}
        </svg>
        <span className="vt__brand"><Film size={12} aria-hidden="true" /> MOVIELANCHE</span>
      </div>
      <div className="vt__stars" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <Star key={index} size={8} fill="currentColor" />)}</div>

      <div className="vt__movie">
        <ImageWithFallback src={booking.poster} alt={`${booking.movieTitle} poster`} className="vt__poster" />
        <div>
          <h2>{booking.movieTitle}{booking.movieLanguage && <span> ({booking.movieLanguage})</span>}</h2>
          <p className="vt__time">{booking.time}</p>
          <p>{booking.theatreName}: {booking.theatreArea}</p>
          <p className="vt__sub">{booking.format}{booking.movieDuration ? ` · ${booking.movieDuration}` : ''}</p>
        </div>
      </div>

      <div className="vt__tear" role="group" aria-label="Show details">
        <div className="vt__date"><CalendarDays size={11} aria-hidden="true" /><span>{weekday}</span><strong>{date.getDate()}</strong><span>{month}</span></div>
        <div className="vt__cell"><small>SCREEN</small><strong>{booking.screen}</strong><span>{count} {count === 1 ? 'Ticket' : 'Tickets'}: {seatClass(booking.seats)}</span></div>
        <div className="vt__cell vt__cell--seats"><small>SEATS</small><strong>{booking.seats.join(', ')}</strong></div>
      </div>

      <div className="vt__paid">
        <p>BOOKING ID : <b>{booking.id}</b></p>
        <span className="vt__pill">Total Amount: <b>{formatCurrency(booking.total)}</b></span>
      </div>

      <div className="vt__foot">
        <div className="vt__qr"><QrCode value={qrValue} label={`QR code for booking ${booking.id}`} /></div>
        <div className="vt__scan"><strong>SCAN AT ENTRY</strong><span>Show this code at the theatre gate. Demo ticket: no real cinema is connected.</span></div>
        <Clapperboard className="vt__mark" size={54} strokeWidth={1.3} aria-hidden="true" />
      </div>
    </article>
  );
}

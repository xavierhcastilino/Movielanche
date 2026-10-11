import type { CSSProperties } from 'react';
import { Armchair, CalendarDays, Clock3, MapPin, QrCode, Ticket } from 'lucide-react';
import type { Booking } from '../types/booking';
import { ImageWithFallback } from './ImageWithFallback';
import { formatCurrency } from '../utils/formatCurrency';

const codePattern = [
  '11110100111', '10010110101', '10110100101', '10010111101', '11110101011',
  '00001010000', '11011101101', '01100011010', '10111010101', '10001101011', '11100111101',
];
const barcodePattern = [3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3];

interface TicketCardProps {
  booking: Booking;
  reveal?: boolean;
}

export function TicketCard({ booking, reveal = false }: TicketCardProps) {
  const backdrop = booking.movieBackdrop || booking.poster;
  const ticketStyle = { '--ticket-backdrop': `url("${backdrop}")` } as CSSProperties;

  return (
    <article className={reveal ? 'ticket-card ticket-card--reveal' : 'ticket-card'} id="printable-ticket" style={ticketStyle}>
      <div className="ticket-card__main">
        <div className="ticket-card__backdrop" aria-hidden="true">
          <ImageWithFallback src={backdrop} alt="" className="ticket-card__backdrop-image" />
          <span className="ticket-card__backdrop-label">NOW PLAYING · MOVIELANCHE</span>
        </div>
        <div className="ticket-card__brand"><img className="brand__mark" src="/brand/emblem.png" alt="" /> MOVIELANCHE <small>AN AVALANCHE OF MOVIES.</small></div>
        <div className="ticket-card__movie">
          <ImageWithFallback src={booking.poster} alt={`${booking.movieTitle} poster`} className="ticket-card__poster" />
          <div><span className="eyebrow">YOUR CINEMA TICKET</span><h2>{booking.movieTitle}</h2><span className="ticket-chip">{booking.movieLanguage ? `${booking.movieLanguage} · ` : ''}{booking.format}{booking.movieDuration ? ` · ${booking.movieDuration}` : ''}</span></div>
        </div>
        <div className="ticket-card__details">
          <div><MapPin size={15} aria-hidden="true" /><span><small>THEATRE</small>{booking.theatreName}<em>{booking.theatreArea}, {booking.city}</em></span></div>
          <div><CalendarDays size={15} aria-hidden="true" /><span><small>DATE</small>{new Date(`${booking.dateISO}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          <div><Clock3 size={15} aria-hidden="true" /><span><small>SHOWTIME · SCREEN</small>{booking.time}<em>{booking.screen}</em></span></div>
          <div><Armchair size={15} aria-hidden="true" /><span><small>SEATS · {booking.seats.length} {booking.seats.length === 1 ? 'TICKET' : 'TICKETS'}</small>{booking.seats.join(', ')}</span></div>
        </div>
        <div className="ticket-card__pricing" aria-label="Demo booking price breakdown">
          <div><span>Ticket subtotal</span><strong>{formatCurrency(booking.subtotal)}</strong></div>
          <div><span>Convenience fee · demo</span><strong>{formatCurrency(booking.convenienceFee)}</strong></div>
          <div className="ticket-card__price-total"><span>TOTAL · DEMO</span><strong>{formatCurrency(booking.total)}</strong></div>
        </div>
        <div className="ticket-card__id"><span>DEMO BOOKING ID</span><strong>{booking.id}</strong></div>
      </div>
      <div className="ticket-card__stub">
        <span className="ticket-card__perforation" aria-hidden="true" />
        <div className="ticket-qr" role="img" aria-label="Decorative code pattern, not scannable">
          {codePattern.join('').split('').map((cell, index) => <i key={index} className={cell === '1' ? 'is-dark' : ''} />)}
        </div>
        <div className="ticket-barcode" role="img" aria-label="Decorative barcode, not scannable">
          {barcodePattern.map((width, index) => <i key={index} style={{ '--bar-width': `${width}px` } as CSSProperties} />)}
        </div>
        <QrCode size={15} aria-hidden="true" />
        <small>DEMO TICKET<br />NOT SCANNABLE</small>
        <span className="ticket-stub-count"><Ticket size={13} aria-hidden="true" /> {booking.seats.length} {booking.seats.length === 1 ? 'ticket' : 'tickets'}</span>
      </div>
    </article>
  );
}

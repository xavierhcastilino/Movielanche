import { TicketCheck } from 'lucide-react';
import { calculateBookingTotals, getPremiumPrice, isPremiumSeat } from '../utils/booking';
import { formatCurrency } from '../utils/formatCurrency';

interface BookingSummaryProps {
  movieTitle: string;
  theatreName: string;
  theatreArea: string;
  date: string;
  time: string;
  format?: string;
  seats: string[];
  ticketPrice: number;
  actionLabel?: string;
  disabled?: boolean;
  onAction?: () => void;
}

export function BookingSummary({
  movieTitle,
  theatreName,
  theatreArea,
  date,
  time,
  format,
  seats,
  ticketPrice,
  actionLabel,
  disabled = false,
  onAction,
}: BookingSummaryProps) {
  const totals = calculateBookingTotals(ticketPrice, seats);
  const premiumCount = seats.filter(isPremiumSeat).length;
  const standardCount = seats.length - premiumCount;

  return (
    <aside className="booking-summary">
      <div className="booking-summary__title"><span className="eyebrow">YOUR NIGHT OUT</span><TicketCheck size={19} aria-hidden="true" /></div>
      <h3>{movieTitle}</h3>
      <dl className="booking-summary__details">
        <div><dt>Theatre</dt><dd>{theatreName}<small>{theatreArea}</small></dd></div>
        <div><dt>Date</dt><dd>{date}</dd></div>
        <div><dt>Showtime</dt><dd>{time}{format && <small>{format}</small>}</dd></div>
        <div><dt>Seats · {seats.length}</dt><dd>{seats.length ? seats.join(', ') : 'Choose seats'}</dd></div>
      </dl>
      <div className="booking-summary__price">
        {standardCount > 0 && <div><span>Standard ({standardCount} × {formatCurrency(ticketPrice)})</span><b>{formatCurrency(standardCount * ticketPrice)}</b></div>}
        {premiumCount > 0 && <div><span>Premium ({premiumCount} × {formatCurrency(getPremiumPrice(ticketPrice))})</span><b>{formatCurrency(premiumCount * getPremiumPrice(ticketPrice))}</b></div>}
        {seats.length === 0 && <div><span>Tickets</span><b>{formatCurrency(0)}</b></div>}
        <div><span>Convenience fee</span><b>{formatCurrency(totals.convenienceFee)}</b></div>
        <div className="booking-summary__total"><span>Total</span><b>{formatCurrency(totals.total)}</b></div>
      </div>
      {actionLabel && onAction && <button className="button button--primary button--wide" type="button" onClick={onAction} disabled={disabled}>{actionLabel}</button>}
      <p className="prototype-note">Sample pricing for this frontend demo. No payment is collected.</p>
    </aside>
  );
}

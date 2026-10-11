import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bike, Bus, Car, CarTaxiFront, Truck, X, type LucideIcon } from 'lucide-react';
import { getPremiumPrice, MAX_SEATS } from '../utils/booking';
import { formatCurrency } from '../utils/formatCurrency';

const rides: LucideIcon[] = [Bike, Bike, CarTaxiFront, Car, Bus, Truck];
const rideLabels = ['Solo ride', 'Duo ride', 'Auto ride', 'Car ride', 'Bus ride', 'Truck ride'];

interface SeatCountSheetProps {
  open: boolean;
  movieTitle: string;
  subtitle: string;
  ticketPrice: number;
  initialCount?: number;
  onClose: () => void;
  onConfirm: (count: number) => void;
}

/** BookMyShow-style bottom sheet: slides up after a showtime is picked and asks how many seats. */
export function SeatCountSheet({ open, movieTitle, subtitle, ticketPrice, initialCount = 2, onClose, onConfirm }: SeatCountSheetProps) {
  const [count, setCount] = useState(initialCount);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(open);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const Ride = rides[count - 1];
  const premiumPrice = getPremiumPrice(ticketPrice);

  useEffect(() => {
    if (open) { setMounted(true); setLeaving(false); setCount(initialCount); lastFocus.current = document.activeElement as HTMLElement | null; return undefined; }
    if (!mounted) return undefined;
    setLeaving(true);
    const timer = window.setTimeout(() => { setMounted(false); setLeaving(false); lastFocus.current?.focus?.(); }, 260);
    return () => window.clearTimeout(timer);
  }, [open, initialCount, mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [mounted, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={`seat-sheet-root${leaving ? ' is-leaving' : ''}`}>
      <button type="button" className="seat-sheet-backdrop" aria-label="Close seat selection" onClick={onClose} tabIndex={-1} />
      <div className="seat-sheet" role="dialog" aria-modal="true" aria-labelledby="seat-sheet-title" ref={dialogRef} tabIndex={-1}>
        <span className="seat-sheet__grabber" aria-hidden="true" />
        <header className="seat-sheet__head">
          <div><span className="eyebrow">{movieTitle}</span><h2 id="seat-sheet-title">How many seats?</h2><p>{subtitle}</p></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="seat-sheet__ride" aria-hidden="true"><Ride key={count} size={64} strokeWidth={1.4} /><span>{rideLabels[count - 1]}</span></div>
        <div className="seat-sheet__counts" role="radiogroup" aria-label="Number of seats">
          {Array.from({ length: MAX_SEATS }, (_, index) => index + 1).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={count === value} className={count === value ? 'is-active' : ''} onClick={() => setCount(value)}>{value}</button>
          ))}
        </div>
        <ul className="seat-sheet__tiers" aria-label="Ticket prices">
          <li><span><strong>Standard</strong><small>Rows C – H</small></span><b>{formatCurrency(ticketPrice)}</b><em>Available</em></li>
          <li><span><strong>Premium</strong><small>Rows A – B · best view</small></span><b>{formatCurrency(premiumPrice)}</b><em>Few left</em></li>
        </ul>
        <button type="button" className="button button--primary button--wide seat-sheet__cta" onClick={() => onConfirm(count)}>
          Select {count} {count === 1 ? 'seat' : 'seats'} · from {formatCurrency(ticketPrice * count)}
        </button>
      </div>
    </div>,
    document.body,
  );
}

import { MapPin, Navigation, Volume2 } from 'lucide-react';
import type { MovieShow } from '../data/shows';
import { formatCurrency } from '../utils/formatCurrency';

interface TheatreCardProps {
  name: string;
  area: string;
  distance: string;
  formats: string[];
  shows: MovieShow[];
  /** Marks the closest theatre in the list. */
  nearest?: boolean;
  onChoose: (show: MovieShow) => void;
}

const statusLabel = { available: 'Available', 'fast-filling': 'Filling fast', 'sold-out': 'Sold out' } as const;

export function TheatreCard({ name, area, distance, formats, shows, nearest = false, onChoose }: TheatreCardProps) {
  const city = shows[0]?.city ?? '';
  const fromPrice = shows.length ? Math.min(...shows.map((show) => show.ticketPrice)) : 0;

  return (
    <article className="theatre-card" aria-label={name}>
      <div className="theatre-card__info">
        <div className="theatre-card__title">
          <h3>{name}</h3>
          {nearest && <span className="theatre-card__badge">Nearest</span>}
        </div>
        <p className="theatre-card__location"><MapPin size={14} aria-hidden="true" /> {area}{city && `, ${city}`}</p>
        <p className="theatre-card__distance"><Navigation size={13} aria-hidden="true" /> {distance} away</p>
        <ul className="theatre-card__formats" aria-label="Available formats">
          {formats.map((format) => <li key={format}>{format.includes('Atmos') && <Volume2 size={12} aria-hidden="true" />}{format}</li>)}
        </ul>
        {fromPrice > 0 && <p className="theatre-card__price">Tickets from <strong>{formatCurrency(fromPrice)}</strong></p>}
      </div>
      <div className="theatre-card__times">
        {shows.map((show) => {
          const [clock, meridiem] = show.time.split(' ');
          return (
            <button
              type="button"
              key={show.id}
              className={`showtime showtime--${show.status}`}
              onClick={() => onChoose(show)}
              disabled={show.status === 'sold-out'}
              aria-label={`${show.time}, ${show.format}, ${statusLabel[show.status]}`}
            >
              <span className="showtime__time">{clock}<small>{meridiem}</small></span>
              <span className="showtime__format">{show.status === 'sold-out' ? 'Sold out' : show.format}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

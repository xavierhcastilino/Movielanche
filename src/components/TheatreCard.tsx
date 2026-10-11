import { MapPin, Volume2 } from 'lucide-react';
import type { MovieShow } from '../data/shows';

interface TheatreCardProps {
  name: string;
  area: string;
  distance: string;
  formats: string[];
  shows: MovieShow[];
  onChoose: (show: MovieShow) => void;
}

export function TheatreCard({ name, area, distance, formats, shows, onChoose }: TheatreCardProps) {
  return (
    <article className="theatre-card">
      <div className="theatre-card__head">
        <div>
          <h3>{name}</h3>
          <p className="theatre-card__location"><MapPin size={14} aria-hidden="true" /> {area}, Belagavi <span>· {distance}</span></p>
        </div>
        <span className="theatre-card__icon"><Volume2 size={17} aria-hidden="true" /></span>
      </div>
      <div className="theatre-card__formats" aria-label="Available formats">
        {formats.map((format) => <span key={format}>{format}</span>)}
      </div>
      <div className="theatre-card__times">
        {shows.map((show) => (
          <button
            type="button"
            key={show.id}
            className={`showtime-button showtime-button--${show.status}`}
            onClick={() => onChoose(show)}
            disabled={show.status === 'sold-out'}
            aria-label={`${show.time}, ${show.format}, ${show.status.replace('-', ' ')}`}
          >
            <span>{show.time}</span>
            <small>{show.status === 'fast-filling' ? 'Fast filling' : show.status === 'sold-out' ? 'Sold out' : show.format}</small>
          </button>
        ))}
      </div>
      <p className="prototype-note">Sample schedule · availability is not live</p>
    </article>
  );
}

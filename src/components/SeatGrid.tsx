import { Armchair } from 'lucide-react';
import { getSeatRows } from '../utils/booking';

interface SeatGridProps {
  selected: string[];
  occupied: Set<string>;
  onToggle: (seatId: string) => void;
}

const seatNumbers = Array.from({ length: 8 }, (_, index) => index + 1);

export function SeatGrid({ selected, occupied, onToggle }: SeatGridProps) {
  const rows = getSeatRows();

  return (
    <div className="seat-layout">
      <div className="seat-map-toolbar">
        <div><p className="eyebrow">SCREENING ROOM MAP</p><strong>Choose your view</strong><small>Center seats are highlighted as the preferred demo zone.</small></div>
        <div className="seat-map-zones" aria-label="Seat zones"><span>PREMIUM</span><span>STANDARD</span></div>
      </div>
      <div className="screen-curve"><span>SCREEN · FRONT OF HOUSE</span></div>
      <div className="seat-column-labels" aria-hidden="true">
        <span />
        {seatNumbers.map((number) => <span key={number}>{number}</span>)}
        <span />
      </div>
      <div className="seat-grid" role="group" aria-label="Cinema seat selection">
        {rows.map((row, rowIndex) => (
          <div className={`seat-row seat-row--${rowIndex < 2 ? 'premium' : 'standard'}`} key={row} aria-label={`${rowIndex < 2 ? 'Premium' : 'Standard'} row ${row}`}>
            <span className="seat-row__label">{row}</span>
            <div className="seat-row__seats">
              {seatNumbers.map((number) => {
                const seatId = `${row}${number}`;
                const isOccupied = occupied.has(seatId);
                const isSelected = selected.includes(seatId);
                const status = isOccupied ? 'occupied' : isSelected ? 'selected' : 'available';
                return (
                  <button
                    type="button"
                    key={seatId}
                    className={`seat seat--${status} ${number === 5 ? 'seat--aisle' : ''}`}
                    onClick={() => !isOccupied && onToggle(seatId)}
                    disabled={isOccupied}
                    aria-pressed={isSelected}
                    aria-label={`Seat ${seatId}, ${status}`}
                    title={`${seatId} · ${status}`}
                  >
                    <Armchair size={15} aria-hidden="true" />
                    <span className="sr-only">{seatId}</span>
                  </button>
                );
              })}
            </div>
            <span className="seat-row__label">{row}</span>
          </div>
        ))}
      </div>
      <div className="seat-legend" aria-label="Seat legend">
        <span><i className="seat-legend__dot seat-legend__dot--available" /> Available</span>
        <span><i className="seat-legend__dot seat-legend__dot--selected" /> Selected</span>
        <span><i className="seat-legend__dot seat-legend__dot--occupied" /> Occupied</span>
        <span><i className="seat-legend__dot seat-legend__dot--premium" /> Premium zone</span>
      </div>
    </div>
  );
}

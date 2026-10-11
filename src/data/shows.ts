import { theatres } from './theatres';

export interface MovieShow {
  id: string;
  movieId: string;
  theatreId: string;
  theatreName: string;
  area: string;
  city: string;
  distance: string;
  dateISO: string;
  dateLabel: string;
  time: string;
  format: string;
  screen: string;
  ticketPrice: number;
  status: 'available' | 'fast-filling' | 'sold-out';
}

const times = ['10:30 AM', '1:45 PM', '4:30 PM', '7:30 PM', '10:15 PM'];

export function getNextDates(count = 5): Array<{ iso: string; label: string; day: string }> {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const label = index === 0 ? 'TODAY' : index === 1 ? 'TOMORROW' : date.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }).toUpperCase();
    const day = index < 2 ? date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase() : date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
    return { iso, label, day };
  });
}

export function createShows(movieId: string, dateISO: string): MovieShow[] {
  return theatres.flatMap((theatre, theatreIndex) =>
    times.slice(0, theatreIndex === 1 ? 4 : 5).map((time, timeIndex) => {
      const date = new Date(`${dateISO}T12:00:00`);
      const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
      const format = theatre.formats[timeIndex % theatre.formats.length];
      const isSoldOut = theatreIndex === 2 && timeIndex === 0;
      return {
        id: `${movieId}_${theatre.id}_${dateISO.replaceAll('-', '')}_${timeIndex}`,
        movieId,
        theatreId: theatre.id,
        theatreName: theatre.name,
        area: theatre.area,
        city: theatre.city,
        distance: theatre.distance,
        dateISO,
        dateLabel,
        time,
        format,
        screen: theatre.screen,
        ticketPrice: theatre.ticketPrice,
        status: isSoldOut ? 'sold-out' : timeIndex === 3 ? 'fast-filling' : 'available',
      };
    }),
  );
}

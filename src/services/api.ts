import { movies } from '../data/movies';
import { createShows, type MovieShow } from '../data/shows';
import { theatres } from '../data/theatres';
import type { Booking, BookingDraft } from '../types/booking';
import type { Movie } from '../types/movie';
import { calculateBookingTotals, getBookings, getOccupiedSeatIds, saveBooking } from '../utils/booking';

export interface TheatreSummary {
  id: string;
  name: string;
  area: string;
  city: string;
  distance: string;
  formats: string[];
  ticketPrice: number;
  screen: string;
}

export async function getMovies(): Promise<Movie[]> {
  // Replace with a backend API call later.
  return movies;
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  // Replace with a backend API call later.
  return movies.find((movie) => movie.id === id);
}

export async function getTheatres(): Promise<TheatreSummary[]> {
  // Replace with a backend API call later.
  return theatres;
}

export async function getShows(movieId: string, dateISO: string): Promise<MovieShow[]> {
  // Replace with a backend API call later. Upcoming catalogue entries have no sample showtimes.
  const movie = movies.find((item) => item.id === movieId);
  return movie?.status === 'now-showing' ? createShows(movieId, dateISO) : [];
}

export async function getShowById(showId: string, movieId: string, dateISO: string): Promise<MovieShow | undefined> {
  const shows = await getShows(movieId, dateISO);
  return shows.find((show) => show.id === showId);
}

export async function getSeats(showId: string): Promise<Array<{ id: string; state: 'available' | 'occupied' }>> {
  // Replace with a backend API call later; occupied seats are deterministic demo fixtures.
  const occupied = getOccupiedSeatIds(showId);
  return Array.from({ length: 8 }, (_, rowIndex) =>
    Array.from({ length: 8 }, (_, seatIndex) => {
      const id = `${String.fromCharCode(65 + rowIndex)}${seatIndex + 1}`;
      return { id, state: occupied.has(id) ? 'occupied' as const : 'available' as const };
    }),
  ).flat();
}

export async function createBooking(draft: BookingDraft): Promise<Booking> {
  // Replace with a backend API call later. This never charges a payment method.
  const movie = movies.find((item) => item.id === draft.movieId);
  if (!movie) throw new Error('This movie is no longer available in the demo catalogue.');
  if (movie.status !== 'now-showing') throw new Error('This title is coming soon and has no sample showtimes yet.');
  if (draft.seats.length < 1 || draft.seats.length > 6) throw new Error('Choose between one and six available seats.');
  const occupied = getOccupiedSeatIds(draft.showId);
  if (draft.seats.some((seat) => occupied.has(seat))) throw new Error('One of the selected seats is no longer available. Please choose again.');

  const totals = calculateBookingTotals(draft.ticketPrice, draft.seats);
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 8);
  const suffix = Math.floor(10000 + Math.random() * 90000);
  const booking: Booking = {
    id: `ML-${stamp}-${suffix}`,
    movieId: movie.id,
    movieTitle: movie.title,
    poster: movie.poster,
    movieBackdrop: movie.backdrop,
    movieLanguage: movie.language,
    movieDuration: movie.duration,
    theatreName: draft.theatreName,
    theatreArea: draft.theatreArea,
    city: draft.city,
    dateISO: draft.dateISO,
    dateLabel: draft.dateLabel,
    time: draft.time,
    format: draft.format,
    screen: draft.screen,
    seats: draft.seats,
    ...totals,
    contactName: draft.contactName ?? 'Guest',
    contactEmail: draft.contactEmail ?? '',
    contactPhone: draft.contactPhone ?? '',
    paymentMethod: draft.paymentMethod ?? 'UPI',
    createdAt: new Date().toISOString(),
  };
  saveBooking(booking);
  return booking;
}

export async function getMyBookings(): Promise<Booking[]> {
  // Replace with a backend API call later.
  return getBookings();
}

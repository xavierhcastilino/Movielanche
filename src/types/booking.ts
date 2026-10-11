export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking';
export type SeatState = 'available' | 'selected' | 'occupied';

export interface BookingDraft {
  movieId: string;
  showId: string;
  theatreId: string;
  theatreName: string;
  theatreArea: string;
  city: string;
  distance: string;
  dateISO: string;
  dateLabel: string;
  time: string;
  format: string;
  screen: string;
  ticketPrice: number;
  seats: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentMethod?: PaymentMethod;
}

export interface Booking {
  id: string;
  movieId: string;
  movieTitle: string;
  poster: string;
  movieBackdrop?: string;
  movieLanguage?: import('./movie').Language;
  movieDuration?: string;
  theatreName: string;
  theatreArea: string;
  city: string;
  dateISO: string;
  dateLabel: string;
  time: string;
  format: string;
  screen: string;
  seats: string[];
  subtotal: number;
  convenienceFee: number;
  total: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

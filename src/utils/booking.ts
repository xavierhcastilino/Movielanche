import type { Booking, BookingDraft } from '../types/booking';

const DRAFT_KEY = 'movielanche:booking-draft';
const BOOKINGS_KEY = 'movielanche:bookings';
const LAST_BOOKING_KEY = 'movielanche:last-booking';
export const CONVENIENCE_FEE = 40;
export const MAX_SEATS = 6;
/** Rows A and B are the premium zone shown on the seat map. */
export const PREMIUM_ROWS = ['A', 'B'];
export const PREMIUM_SURCHARGE = 80;

export const isPremiumSeat = (seatId: string) => PREMIUM_ROWS.includes(seatId.charAt(0));
export const getPremiumPrice = (basePrice: number) => basePrice + PREMIUM_SURCHARGE;
export const getSeatPrice = (basePrice: number, seatId: string) => (isPremiumSeat(seatId) ? getPremiumPrice(basePrice) : basePrice);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasTextFields(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidPaymentMethod(value: unknown): value is Booking['paymentMethod'] {
  return value === 'UPI' || value === 'Card' || value === 'Net Banking';
}

function isBookingDraft(value: unknown): value is BookingDraft {
  if (!isRecord(value)) return false;
  return hasTextFields(value, ['movieId', 'showId', 'theatreId', 'theatreName', 'theatreArea', 'city', 'distance', 'dateISO', 'dateLabel', 'time', 'format', 'screen'])
    && typeof value.ticketPrice === 'number' && Number.isFinite(value.ticketPrice) && value.ticketPrice >= 0
    && isStringArray(value.seats)
    && (value.seatCount === undefined || (typeof value.seatCount === 'number' && Number.isInteger(value.seatCount) && value.seatCount >= 1 && value.seatCount <= MAX_SEATS))
    && (value.contactName === undefined || typeof value.contactName === 'string')
    && (value.contactEmail === undefined || typeof value.contactEmail === 'string')
    && (value.contactPhone === undefined || typeof value.contactPhone === 'string')
    && (value.paymentMethod === undefined || isValidPaymentMethod(value.paymentMethod));
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
  return hasTextFields(value, ['id', 'movieId', 'movieTitle', 'poster', 'theatreName', 'theatreArea', 'city', 'dateISO', 'dateLabel', 'time', 'format', 'screen', 'contactName', 'contactEmail', 'contactPhone', 'createdAt'])
    && isStringArray(value.seats) && value.seats.length > 0
    && typeof value.subtotal === 'number' && Number.isFinite(value.subtotal)
    && typeof value.convenienceFee === 'number' && Number.isFinite(value.convenienceFee)
    && typeof value.total === 'number' && Number.isFinite(value.total)
    && isValidPaymentMethod(value.paymentMethod);
}

export function getBookingDraft(): BookingDraft | null {
  const value = readJSON<unknown>(DRAFT_KEY, null);
  return isBookingDraft(value) ? value : null;
}

export function saveBookingDraft(draft: BookingDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The active flow still works in memory when browser storage is unavailable.
  }
}

export function clearBookingDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // A disabled storage API must not prevent the current confirmation view.
  }
}

export function getBookings(): Booking[] {
  const value = readJSON<unknown>(BOOKINGS_KEY, []);
  return Array.isArray(value) ? value.filter(isBooking) : [];
}

export function saveBooking(booking: Booking): void {
  const bookings = [booking, ...getBookings().filter((item) => item.id !== booking.id)];
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    localStorage.setItem(LAST_BOOKING_KEY, JSON.stringify(booking));
  } catch {
    // Confirmation remains available for the current session even if storage is blocked.
  }
}

export function getLastBooking(): Booking | null {
  const value = readJSON<unknown>(LAST_BOOKING_KEY, null);
  return isBooking(value) ? value : null;
}

/** `seats` is either the seat ids (priced per zone) or just a count of standard seats. */
export function calculateBookingTotals(ticketPrice: number, seats: string[] | number) {
  const count = Array.isArray(seats) ? seats.length : seats;
  const subtotal = Array.isArray(seats) ? seats.reduce((sum, seatId) => sum + getSeatPrice(ticketPrice, seatId), 0) : ticketPrice * seats;
  const convenienceFee = count > 0 ? CONVENIENCE_FEE : 0;
  return { subtotal, convenienceFee, total: subtotal + convenienceFee };
}

export function getOccupiedSeatIds(showId: string): Set<string> {
  const seed = showId.length;
  const patterns = [
    ['A3', 'A4', 'C6', 'D4', 'F5', 'H2'],
    ['A5', 'B4', 'C2', 'E6', 'G3'],
    ['B2', 'B3', 'D6', 'E4', 'H5'],
  ];
  return new Set(patterns[seed % patterns.length]);
}

export function getSeatRows(): string[] {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
}

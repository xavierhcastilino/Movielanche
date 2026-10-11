import { useEffect, useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Ticket, ShieldCheck } from 'lucide-react';
import { TicketCard } from '../components/TicketCard';
import { getLastBooking } from '../utils/booking';
import type { Booking } from '../types/booking';

interface ConfirmationState {
  booking?: Booking;
  revealTicket?: boolean;
}

export function BookingConfirmation() {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;
  const booking = state?.booking ?? getLastBooking();
  const [revealTicket, setRevealTicket] = useState(false);

  useEffect(() => {
    if (!booking || state?.revealTicket !== true) return;
    const revealKey = `movielanche:ticket-reveal:${booking.id}`;
    try {
      if (window.sessionStorage.getItem(revealKey) === 'true') return;
      window.sessionStorage.setItem(revealKey, 'true');
    } catch {
      // Keep the reveal available for this successful checkout if storage is unavailable.
    }
    setRevealTicket(true);
  }, [booking?.id, state?.revealTicket]);

  if (!booking) return <Navigate to="/movies" replace />;

  return (
    <div className={revealTicket ? 'page-wrap inner-page confirmation-page confirmation-page--reveal' : 'page-wrap inner-page confirmation-page'}>
      <div className="confirmation-heading"><span className="confirmation-heading__icon"><ShieldCheck size={25} /></span><p className="eyebrow">THE PLAN IS SET</p><h1>Booking confirmed<span className="heading-period">.</span></h1><p>Your ticket has landed. This is a frontend demo booking—no cinema has been notified.</p></div>
      <TicketCard booking={booking} reveal={revealTicket} />
      <div className="confirmation-actions"><a className="button button--primary" href="#printable-ticket"><Ticket size={16} /> View Ticket</a><Link className="button button--secondary" to="/bookings">My Bookings <ArrowRight size={16} /></Link><Link className="button button--secondary" to="/movies"><ArrowLeft size={16} /> Back to Movies</Link><button className="button button--secondary" type="button" onClick={() => window.print()}><Download size={16} /> Download ticket</button></div>
      <p className="prototype-note confirmation-note">DEMO CONFIRMATION · The QR holds your booking details · No payment or real seat reservation</p>
    </div>
  );
}

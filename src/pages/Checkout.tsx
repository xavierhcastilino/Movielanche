import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CreditCard, Smartphone, WalletCards } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BookingSummary } from '../components/BookingSummary';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { movies } from '../data/movies';
import { createBooking } from '../services/api';
import type { BookingDraft, PaymentMethod } from '../types/booking';
import { clearBookingDraft, getBookingDraft } from '../utils/booking';

const paymentOptions: Array<{ value: PaymentMethod; icon: typeof Smartphone; note: string }> = [
  { value: 'UPI', icon: Smartphone, note: 'Demo option' },
  { value: 'Card', icon: CreditCard, note: 'Demo option' },
  { value: 'Net Banking', icon: WalletCards, note: 'Demo option' },
];

export function Checkout() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft | null>(() => getBookingDraft());
  const [name, setName] = useState(draft?.contactName ?? '');
  const [email, setEmail] = useState(draft?.contactEmail ?? '');
  const [phone, setPhone] = useState(draft?.contactPhone ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(draft?.paymentMethod ?? 'UPI');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!draft || draft.seats.length === 0) return <Navigate to={draft ? `/seats/${draft.showId}` : '/movies'} replace />;
  const movie = movies.find((item) => item.id === draft.movieId);
  if (!movie) return <div className="page-wrap inner-page"><EmptyState title="This booking draft is no longer available." /><Link to="/movies" className="button button--secondary">Explore movies</Link></div>;

  const updateDraft = (changes: Partial<BookingDraft>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    try { localStorage.setItem('movielanche:booking-draft', JSON.stringify(next)); } catch { /* Continue with the current in-memory draft. */ }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const booking = await createBooking({ ...draft, contactName: name.trim(), contactEmail: email.trim(), contactPhone: phone.trim(), paymentMethod });
      clearBookingDraft();
      navigate('/booking-confirmation', { state: { booking, revealTicket: true } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The demo booking could not be created. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrap inner-page checkout-page">
      <Link to={`/seats/${draft.showId}`} className="back-link"><ArrowLeft size={15} /> Back to seats</Link>
      <header className="page-heading"><p className="eyebrow">STEP 04 / LAST LOOK</p><h1>Review your booking<span className="heading-period">.</span></h1><p>Check the details before creating your demo ticket.</p></header>
      <form className="booking-layout checkout-layout" onSubmit={handleSubmit}>
        <div className="checkout-main">
          <section className="checkout-film-card">
            <ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} />
            <div><span className="eyebrow">MOVIE NIGHT</span><h2>{movie.title}</h2><p>{draft.theatreName} · {draft.theatreArea}, {draft.city}</p><p>{draft.dateLabel} · {draft.time} · {draft.format}</p><p>Seats: <strong>{draft.seats.join(', ')}</strong></p></div>
          </section>
          <section className="checkout-section">
            <div className="checkout-section__heading"><span className="step-index">01</span><div><h2>Contact details</h2><p>Your ticket details stay in this browser demo.</p></div></div>
            <div className="contact-grid">
              <label className="form-field form-field--wide">Full name<input autoComplete="name" required value={name} onChange={(event) => { setName(event.target.value); updateDraft({ contactName: event.target.value }); }} placeholder="Your name" /></label>
              <label className="form-field">Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); updateDraft({ contactEmail: event.target.value }); }} placeholder="you@example.com" /></label>
              <label className="form-field">Phone number<input type="tel" autoComplete="tel" required value={phone} onChange={(event) => { setPhone(event.target.value); updateDraft({ contactPhone: event.target.value }); }} placeholder="+91 98765 43210" /></label>
            </div>
          </section>
          <section className="checkout-section">
            <div className="checkout-section__heading"><span className="step-index">02</span><div><h2>Choose a demo method</h2><p>No money will be collected or payment processed.</p></div></div>
            <div className="payment-options">
              {paymentOptions.map(({ value, icon: Icon, note }) => <label className={paymentMethod === value ? 'payment-option is-selected' : 'payment-option'} key={value}><input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={() => { setPaymentMethod(value); updateDraft({ paymentMethod: value }); }} /><Icon size={19} aria-hidden="true" /><span><strong>{value}</strong><small>{note}</small></span>{paymentMethod === value && <Check size={16} className="payment-option__check" aria-hidden="true" />}</label>)}
            </div>
          </section>
          {error && <p className="form-message" role="alert">{error}</p>}
          <div className="checkout-actions"><p>Prototype only · this does not reserve seats at a real cinema.</p><button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Creating ticket…' : 'Confirm demo booking'} <Check size={16} /></button></div>
        </div>
        <BookingSummary movieTitle={movie.title} theatreName={draft.theatreName} theatreArea={draft.theatreArea} date={draft.dateLabel} time={draft.time} format={draft.format} seats={draft.seats} ticketPrice={draft.ticketPrice} />
      </form>
    </div>
  );
}

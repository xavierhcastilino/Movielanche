import { useState } from 'react';
import { ArrowLeft, Armchair, CalendarDays, Check, Clock3, MapPin } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { movies } from '../data/movies';
import { createBooking } from '../services/api';
import { calculateBookingTotals, clearBookingDraft, getBookingDraft } from '../utils/booking';
import { formatCurrency } from '../utils/formatCurrency';

const paymentApps = [
  { name: 'Google Pay', mark: 'G', iconClass: 'payment-app-icon--google', intent: 'gpay://upi/pay' },
  { name: 'PhonePe', mark: 'P', iconClass: 'payment-app-icon--phonepe', intent: 'phonepe://pay' },
  { name: 'Paytm', mark: 'paytm', iconClass: 'payment-app-icon--paytm', intent: 'paytmmp://pay' },
  { name: 'BHIM', mark: 'B', iconClass: 'payment-app-icon--bhim', intent: 'bhim://upi/pay' },
] as const;
const upiIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9.-]{0,62}$/;

export function Payment() {
  const navigate = useNavigate();
  const [selectedApp, setSelectedApp] = useState<(typeof paymentApps)[number]['name'] | null>(null);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [payeeUpiId, setPayeeUpiId] = useState(import.meta.env.VITE_UPI_PAYEE_ID?.trim() ?? '');
  const draft = getBookingDraft();

  if (!draft || draft.seats.length === 0) {
    return <Navigate to={draft ? `/seats/${draft.showId}` : '/movies'} replace />;
  }

  const movie = movies.find((item) => item.id === draft.movieId);
  if (!movie) {
    return <div className="page-wrap inner-page"><p className="form-message" role="alert">This booking draft is no longer available.</p><Link to="/movies" className="button button--secondary">Explore movies</Link></div>;
  }

  const totals = calculateBookingTotals(draft.ticketPrice, draft.seats);
  const isUpiIdValid = upiIdPattern.test(payeeUpiId.trim());

  const handleContinue = () => {
    const app = paymentApps.find((item) => item.name === selectedApp);
    const normalizedUpiId = payeeUpiId.trim();
    if (!app || !upiIdPattern.test(normalizedUpiId)) return;

    const params = new URLSearchParams({
      pa: normalizedUpiId,
      pn: 'MOVIELANCHE',
      am: totals.total.toFixed(2),
      cu: 'INR',
      tn: `${movie.title} - ${draft.seats.join(', ')}`,
      tr: `ML-${Date.now()}`,
    });
    setStatus(`Opening ${app.name}. Once you have paid, come back and tap Confirm booking.`);
    try {
      window.location.assign(`${app.intent}?${params.toString()}`);
    } catch {
      setStatus(`Could not open ${app.name}. Check that the app is installed and try again.`);
    }
  };

  const handleSelectApp = (appName: (typeof paymentApps)[number]['name']) => {
    setSelectedApp(appName);
    setStatus('');
  };

  const handleGenerateTicket = async () => {
    setError('');
    setCreating(true);
    try {
      const booking = await createBooking({ ...draft, paymentMethod: 'UPI' });
      clearBookingDraft();
      navigate('/booking-confirmation', { state: { booking, revealTicket: true }, replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The ticket could not be created. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="page-wrap inner-page payment-page">
      <Link to="/checkout" className="back-link"><ArrowLeft size={15} /> Back to booking</Link>
      <header className="page-heading">
        <p className="eyebrow">STEP 05 / PAYMENT</p>
        <h1>Complete your booking<span className="heading-period">.</span></h1>
        <p>Select a UPI app, then confirm your booking to generate your ticket.</p>
      </header>

      <div className="payment-page__layout">
        <section className="payment-page__booking checkout-section" aria-labelledby="payment-booking-heading">
          <div className="checkout-section__heading">
            <span className="step-index">01</span>
            <div><h2 id="payment-booking-heading">Your booking</h2><p>Check your movie and show details.</p></div>
          </div>
          <article className="payment-film-card">
            <ImageWithFallback src={movie.poster} alt={`${movie.title} poster`} />
            <div><span className="eyebrow">MOVIE NIGHT</span><h3>{movie.title}</h3><p>{draft.format} · {draft.screen}</p></div>
          </article>
          <dl className="payment-details">
            <div><dt><MapPin size={14} aria-hidden="true" /> Theatre</dt><dd>{draft.theatreName}<small>{draft.theatreArea}, {draft.city}</small></dd></div>
            <div><dt><CalendarDays size={14} aria-hidden="true" /> Date</dt><dd>{draft.dateLabel}</dd></div>
            <div><dt><Clock3 size={14} aria-hidden="true" /> Showtime</dt><dd>{draft.time}</dd></div>
            <div><dt><Armchair size={14} aria-hidden="true" /> Seats</dt><dd>{draft.seats.join(', ')}</dd></div>
          </dl>
          <div className="payment-total"><span>Total amount</span><strong>{formatCurrency(totals.total)}</strong></div>
        </section>

        <section className="checkout-section payment-page__method" aria-labelledby="payment-method-heading">
          <div className="checkout-section__heading">
            <span className="step-index">02</span>
            <div><h2 id="payment-method-heading">Choose your UPI app</h2><p>Select an app to open its payment screen.</p></div>
          </div>
          <label className="form-field upi-field payment-upi-field">Payee UPI ID
            <input
              type="text"
              name="payeeUpiId"
              inputMode="email"
              autoComplete="off"
              required
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9.-]{0,62}"
              title="Enter a UPI ID in the format name@bank."
              value={payeeUpiId}
              onChange={(event) => { setPayeeUpiId(event.target.value); setStatus(''); }}
              placeholder="yourname@bank"
              aria-describedby="payee-upi-note"
              aria-invalid={payeeUpiId.length > 0 && !isUpiIdValid}
            />
            <small id="payee-upi-note">This recipient ID is used to prepare the payment-app handoff and is not saved.</small>
          </label>
          <div className="payment-app-options" role="radiogroup" aria-label="Select a UPI app">
            {paymentApps.map((app) => (
              <label className={selectedApp === app.name ? 'payment-app-option is-selected' : 'payment-app-option'} key={app.name}>
                <input type="radio" name="upiApp" value={app.name} checked={selectedApp === app.name} onChange={() => handleSelectApp(app.name)} />
                <span className={`payment-app-icon ${app.iconClass}`} aria-hidden="true">{app.mark}</span>
                <strong>{app.name}</strong>
                {selectedApp === app.name && <Check size={15} className="payment-app-option__check" aria-hidden="true" />}
              </label>
            ))}
          </div>
          <p className="payment-demo-warning">Amount: {formatCurrency(totals.total)}. Payment verification is not connected, so this page cannot confirm that your payment went through.</p>
          {isUpiIdValid && selectedApp && (
            <button className="button button--secondary button--wide payment-continue" type="button" onClick={handleContinue}>
              Open {selectedApp} to pay
            </button>
          )}
          {status && <p className="form-message" role="status">{status}</p>}
          <button className="button button--primary button--wide payment-continue" type="button" onClick={handleGenerateTicket} disabled={!selectedApp || creating}>
            {creating ? 'Generating ticket…' : 'Confirm booking'} <Check size={16} />
          </button>
          <p className="payment-ticket-note">{selectedApp ? `Confirming creates your demo ticket for ${formatCurrency(totals.total)}. No payment is verified.` : 'Select a UPI app to enable booking confirmation.'}</p>
          {error && <p className="form-message" role="alert">{error}</p>}
        </section>
      </div>
    </div>
  );
}

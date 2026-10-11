import { useState, type FormEvent } from 'react';
import { ArrowRight, Mail, Play, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { saveDemoAuth } from '../utils/onboarding';

export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const continueToGenres = (event?: FormEvent) => {
    event?.preventDefault();
    if (email && !email.includes('@')) { setMessage('Enter a valid demo email, or continue as a guest.'); return; }
    if (!saveDemoAuth(email)) { setMessage('Browser storage is unavailable. You can still continue for this session.'); }
    navigate('/onboarding/genres');
  };

  return (
    <OnboardingLayout step="01 / 04" eyebrow="WELCOME TO YOUR MOVIE NIGHT">
      <section className="auth-card">
        <div className="auth-card__copy"><span className="auth-card__kicker"><Play size={13} fill="currentColor" /> STREAMING-INSPIRED, CINEMA-FIRST</span><h1>Find the film that feels like <span>your night.</span></h1><p>Start with a few quick choices and MOVIELANCHE will shape a clean, local cinema dashboard around you.</p></div>
        <div className="auth-card__form-wrap">
          <div className="auth-card__form-heading"><Mail size={18} /><div><strong>Continue to MOVIELANCHE</strong><span>Demo access · no real account required</span></div></div>
          <form className="auth-card__form" onSubmit={continueToGenres}>
            <label className="form-field" htmlFor="demo-email">Email address <input id="demo-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(''); }} placeholder="you@example.com" /></label>
            <button className="button button--primary button--wide" type="submit">Continue <ArrowRight size={15} /></button>
          </form>
          <div className="auth-card__divider"><span>or</span></div>
          <button className="button button--secondary button--wide" type="button" onClick={() => continueToGenres()}><span className="auth-google-mark">G</span> Continue with Google <span className="auth-demo-tag">DEMO</span></button>
          <button className="auth-guest" type="button" onClick={() => continueToGenres()}>Continue as guest <ArrowRight size={13} /></button>
          {message && <p className="form-message" role="alert">{message}</p>}
          <p className="auth-card__disclosure"><ShieldCheck size={13} /> This prototype stores choices only in this browser. No credentials are sent anywhere.</p>
        </div>
      </section>
    </OnboardingLayout>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Apple, ArrowLeft, ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { OtpInput } from '../components/OtpInput';
import { formatPhone, getSession, isSessionComplete, isValidIndianMobile, saveSession, sendOtp, signInWithProvider, verifyOtp, type AuthProvider, type AuthSession } from '../services/auth';

type Step = 'phone' | 'phone-otp';

const RESEND_SECONDS = 30;

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => { if (isSessionComplete(session)) navigate(returnTo, { replace: true }); }, [session, navigate, returnTo]);
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const commit = useCallback((next: AuthSession) => { saveSession(next); setSession(next); }, []);
  const fail = (caught: unknown) => setMessage(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');

  const requestOtp = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await sendOtp('phone', phone);
      setStep('phone-otp'); setCode(''); setDemoCode(result.demoCode); setResendIn(RESEND_SECONDS);
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  };

  const submitPhone = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidIndianMobile(phone)) { setMessage('Enter a valid 10-digit mobile number.'); return; }
    void requestOtp();
  };

  const verifyPhone = async (event?: FormEvent) => {
    event?.preventDefault();
    if (code.length !== 6) { setMessage('Enter the 6-digit code.'); return; }
    setBusy(true); setMessage('');
    try {
      await verifyOtp('phone', phone, code);
      commit({ provider: 'phone', phone: formatPhone(phone), phoneVerified: true, createdAt: new Date().toISOString() });
    } catch (caught) { fail(caught); setCode(''); } finally { setBusy(false); }
  };

  const continueWithProvider = async (provider: Exclude<AuthProvider, 'phone'>) => {
    setBusy(true); setMessage('');
    try {
      const account = await signInWithProvider(provider);
      commit({ provider: account.provider, phoneVerified: false, createdAt: new Date().toISOString() });
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  };

  const changeNumber = () => { setStep('phone'); setCode(''); setMessage(''); setDemoCode(''); };

  return (
    <OnboardingLayout step="01 / 04" eyebrow="WELCOME TO YOUR MOVIE NIGHT">
      <section className="auth-card">
        <div className="auth-card__copy"><span className="auth-card__kicker"><ShieldCheck size={13} /> VERIFIED TICKETS, EVERY TIME</span><h1>Sign in to <span>your seat.</span></h1><p>Log in with your mobile number or a Google / Apple account. Your tickets, QR codes and booking history stay tied to you.</p></div>
        <div className="auth-card__form-wrap">
          {step === 'phone' ? (
            <form className="auth-card__form auth-step" onSubmit={submitPhone} noValidate>
              <div className="auth-card__form-heading"><Phone size={18} /><div><strong>Continue with mobile</strong><span>We'll text you a 6-digit code</span></div></div>
              <label className="form-field" htmlFor="auth-phone">Mobile number
                <span className="phone-input"><span className="phone-input__prefix">+91</span><input id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setMessage(''); }} placeholder="98765 43210" aria-invalid={Boolean(message)} /></span>
              </label>
              <button className="button button--primary button--wide" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Get OTP'} <ArrowRight size={15} /></button>
              <div className="auth-card__divider"><span>or continue with</span></div>
              <div className="auth-social">
                <button className="button button--secondary" type="button" disabled={busy} onClick={() => void continueWithProvider('google')}><span className="auth-google-mark">G</span> Google</button>
                <button className="button button--secondary" type="button" disabled={busy} onClick={() => void continueWithProvider('apple')}><Apple size={16} /> Apple</button>
              </div>
            </form>
          ) : (
            <form className="auth-card__form auth-step" onSubmit={verifyPhone} noValidate>
              <div className="auth-card__form-heading"><ShieldCheck size={18} /><div><strong>Enter the 6-digit code</strong><span>Sent to {formatPhone(phone)}</span></div></div>
              <OtpInput value={code} onChange={(next) => { setCode(next); setMessage(''); }} disabled={busy} invalid={Boolean(message)} label="One-time password" />
              {demoCode && <button type="button" className="auth-demo-code" onClick={() => setCode(demoCode)}><span>DEMO MODE · no SMS is sent</span><strong>Your code: {demoCode}</strong><em>Tap to fill</em></button>}
              <button className="button button--primary button--wide" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue'} <ArrowRight size={15} /></button>
              <div className="auth-otp-meta">
                <button type="button" className="auth-guest" onClick={changeNumber}><ArrowLeft size={13} /> Change number</button>
                <button type="button" className="auth-guest" onClick={() => void requestOtp()} disabled={resendIn > 0 || busy}>{resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}</button>
              </div>
            </form>
          )}
          {message && <p className="form-message" role="alert">{message}</p>}
          <p className="auth-card__disclosure"><ShieldCheck size={13} /> <span>Prototype: codes and Google / Apple sign-in are simulated in your browser. Connect real providers in services/auth.ts.</span></p>
        </div>
      </section>
    </OnboardingLayout>
  );
}

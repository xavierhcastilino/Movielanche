import { Link } from 'react-router-dom';

export function OnboardingLayout({ step, eyebrow, children }: { step: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="onboarding-shell">
      <div className="onboarding-shell__glow" aria-hidden="true" />
      <header className="onboarding-header">
        <Link to="/auth" className="brand onboarding-brand" aria-label="MOVIELANCHE welcome">
          <img className="brand__mark" src="/brand/emblem.png" alt="" />
          <span className="brand__word">MOVIE<span>LANCHE</span><small>AN AVALANCHE OF MOVIES.</small></span>
        </Link>
        <span className="onboarding-header__step">{step}</span>
      </header>
      <main className="onboarding-main">
        <p className="eyebrow">{eyebrow}</p>
        {children}
      </main>
      <p className="onboarding-footnote">MOVIELANCHE · A browser-only cinema demo · No real account or payment is created.</p>
    </div>
  );
}

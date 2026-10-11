import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const INTRO_SEEN_KEY = 'movielanche:cinematic-intro-v2-seen';
const INTRO_DURATION_MS = 6200;

export function CinematicIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true') return;
      window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // The intro still works for this page load if browser storage is unavailable.
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="cinematic-intro" role="group" aria-label="MOVIELANCHE cinematic introduction">
      <div className="cinematic-intro__scene" aria-hidden="true">
        <span className="cinematic-intro__light" />
        <span className="cinematic-intro__streak" />
        <div className="cinematic-intro__lockup">
          <span className="cinematic-intro__mark"><i /><i /><i /></span>
          <span className="cinematic-intro__wordmark">MOVIELANCHE</span>
        </div>
        <p className="cinematic-intro__tagline">AN AVALANCHE OF MOVIES.</p>
        <span className="cinematic-intro__flash" />
      </div>
      <button className="cinematic-intro__skip" type="button" onClick={() => setVisible(false)}>
        Skip intro <ArrowRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const INTRO_SEEN_KEY = 'movielanche:cinematic-intro-v3-seen';
const INTRO_DURATION_MS = 7000;

function hasSeenIntro() {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function CinematicIntro() {
  const [visible, setVisible] = useState(() => !hasSeenIntro());
  const emblemRef = useRef<HTMLImageElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!visible) return;

    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // The intro still works for this page load if browser storage is unavailable.
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  useEffect(() => {
    const emblem = emblemRef.current;
    const wordmark = wordmarkRef.current;
    if (!visible || !emblem || !wordmark || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      gsap.set(emblem, { autoAlpha: 0, x: -window.innerWidth, y: 0, scale: 0.72, rotation: -360, rotationY: 20, transformPerspective: 900, filter: 'blur(9px)' });
      gsap.set(wordmark, { autoAlpha: 0, scale: 0.985, backgroundPosition: '100% 0%', filter: 'none' });
      const timeline = gsap.timeline();
      timeline.to(emblem, { autoAlpha: 1, x: 0, scale: 1, rotation: 0, rotationY: 0, filter: 'drop-shadow(0 0 16px rgba(255, 55, 48, 0.32))', duration: 1.05, ease: 'power3.out' }, 1);
      timeline.to(emblem, { y: -17, scale: 1.045, duration: 0.16, ease: 'power2.out' }, 2.05);
      timeline.to(emblem, { y: 0, scale: 1, duration: 0.38, ease: 'bounce.out' }, 2.21);
      timeline.to(emblem, { filter: 'none', duration: 0.25, ease: 'power1.out' }, 2.34);
      timeline.to(wordmark, { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'power2.out' }, 2.65);
      timeline.to(wordmark, { backgroundPosition: '0% 0%', filter: 'drop-shadow(0 0 12px rgba(255, 70, 60, 0.34))', duration: 1.1, ease: 'power2.inOut' }, 2.8);
      timeline.to(wordmark, { filter: 'none', duration: 0.3, ease: 'power1.out' }, 3.9);
    }, wordmark);

    return () => context.revert();
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="cinematic-intro" role="group" aria-label="MOVIELANCHE cinematic introduction">
      <div className="cinematic-intro__scene">
        <span className="cinematic-intro__glow" />
        <img ref={emblemRef} className="cinematic-intro__emblem" src="/brand/emblem.png" alt="" />
        <h1 ref={wordmarkRef} className="cinematic-intro__wordmark">MOVIELANCHE</h1>
        <p className="cinematic-intro__tagline">Your next movie. Your next experience.</p>
      </div>
      <button className="cinematic-intro__skip" type="button" onClick={() => setVisible(false)}>
        Skip intro <ArrowRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

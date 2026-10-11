import { ArrowLeft, ArrowRight, Check, Film } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { PREFERENCE_GENRES, getDemoPreferences, saveDemoPreferences } from '../utils/preferences';
import type { Genre } from '../types/movie';

const genreNotes: Partial<Record<Genre, string>> = { Action: 'Big energy', Adventure: 'New worlds', Comedy: 'Good company', Drama: 'Stories that stay', Horror: 'A darker seat', Thriller: 'Keep guessing', Romance: 'Warm feelings', 'Sci-Fi': 'Beyond the stars', Fantasy: 'More than real', Animation: 'Colourful worlds', Crime: 'Sharp mysteries', Mystery: 'Look closer', History: 'True stories', Family: 'For everyone', Documentary: 'See it differently', Musical: 'Feel the rhythm' };

export function GenreSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Genre[]>(() => getDemoPreferences().genres);
  const toggle = (genre: Genre) => setSelected((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]);
  const continueToLocation = () => { saveDemoPreferences({ ...getDemoPreferences(), genres: selected }); navigate('/onboarding/location'); };

  return (
    <OnboardingLayout step="02 / 04" eyebrow="TUNE YOUR HOME SCREEN">
      <section className="onboarding-step">
        <div className="onboarding-step__heading"><div><h1>What do you want to feel?</h1><p>Pick a few genres and we’ll make the first row feel like it belongs to you.</p></div><span className="selection-count"><strong>{selected.length}</strong> selected</span></div>
        <div className="genre-card-grid" role="group" aria-label="Choose your favourite genres">
          {PREFERENCE_GENRES.map((genre) => { const isSelected = selected.includes(genre); return <button className={`genre-card${isSelected ? ' is-selected' : ''}`} key={genre} type="button" onClick={() => toggle(genre)} aria-pressed={isSelected}><span className="genre-card__icon"><Film size={16} /></span><span><strong>{genre === 'Sci-Fi' ? 'Science fiction' : genre}</strong><small>{genreNotes[genre]}</small></span><i>{isSelected ? <Check size={14} /> : '+'}</i></button>; })}
        </div>
        <div className="onboarding-actions"><button className="button button--ghost" type="button" onClick={() => navigate('/auth')}><ArrowLeft size={14} /> Back</button><button className="button button--primary" type="button" onClick={continueToLocation}>Choose your city <ArrowRight size={15} /></button></div>
      </section>
    </OnboardingLayout>
  );
}

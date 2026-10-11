import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, MapPin, SlidersHorizontal, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PREFERENCE_GENRES, PREFERENCE_LANGUAGES, DISCOVERY_OPTIONS, DEMO_CITIES, getDemoPreferences, saveDemoPreferences, type DemoPreferences } from '../utils/preferences';
import type { Genre, Language } from '../types/movie';

export function Profile() {
  const [preferences, setPreferences] = useState<DemoPreferences>(getDemoPreferences);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const toggle = <T extends string,>(values: T[], item: T): T[] => values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
  const update = (changes: Partial<DemoPreferences>) => {
    setSaved(false);
    setPreferences((current) => ({ ...current, ...changes }));
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = saveDemoPreferences(preferences);
    setSaved(ok);
    setStorageError(!ok);
  };

  return (
    <div className="page-wrap inner-page profile-page">
      <Link to="/" className="back-link"><ArrowLeft size={15} /> Back to Movielanche</Link>
      <header className="page-heading profile-heading">
        <p className="eyebrow">YOUR LOCAL DEMO PROFILE</p>
        <h1>Make it your kind of cinema<span className="heading-period">.</span></h1>
        <p>Pick what you enjoy. Your selections personalise the film rows on this device.</p>
      </header>

      <aside className="profile-disclosure" role="note">
        <UserRound size={18} aria-hidden="true" />
        <p><strong>Browser-only demo preferences.</strong> This creates no account, uses no login and is saved only in this browser. Movie recommendations are simple matches against the local film fixtures—not machine learning.</p>
      </aside>

      <form className="preferences-form" onSubmit={handleSubmit}>
        <section className="preferences-section">
          <div className="preferences-section__heading"><span>01</span><div><h2>Your cinema location</h2><p>Only Belagavi has sample theatre listings in this demo.</p></div></div>
          <label className="form-field" htmlFor="demo-city">Preferred city
            <select id="demo-city" className="preferences-select" value={preferences.city} onChange={(event) => update({ city: event.target.value })}>
              {DEMO_CITIES.map((city) => <option key={city} value={city}>{city}{city === 'Belagavi' ? ' · sample theatres seeded' : ' · no sample theatres'}</option>)}
            </select>
          </label>
          {preferences.city !== 'Belagavi' && <p className="preferences-hint"><MapPin size={13} /> Discovery remains available, but this demo has no theatre or show data for {preferences.city}.</p>}
        </section>

        <section className="preferences-section">
          <div className="preferences-section__heading"><span>02</span><div><h2>Languages you enjoy</h2><p>Choose any number that reflect your taste.</p></div></div>
          <div className="preferences-choice-grid preferences-choice-grid--languages">
            {PREFERENCE_LANGUAGES.map((language) => <Choice key={language} label={language} selected={preferences.languages.includes(language)} onToggle={() => update({ languages: toggle(preferences.languages, language as Language) })} />)}
          </div>
          {preferences.languages.includes('Malayalam') && <p className="preferences-hint">Malayalam is saved as a preference, but no Malayalam film is in the current local demo collection.</p>}
        </section>

        <section className="preferences-section">
          <div className="preferences-section__heading"><span>03</span><div><h2>Your favourite genres</h2><p>Select more than one; the local collection only matches its recorded genres.</p></div></div>
          <div className="preferences-choice-grid">
            {PREFERENCE_GENRES.map((genre) => <Choice key={genre} label={genre === 'Sci-Fi' ? 'Science fiction' : genre} selected={preferences.genres.includes(genre)} onToggle={() => update({ genres: toggle(preferences.genres, genre as Genre) })} />)}
          </div>
        </section>

        <section className="preferences-section">
          <div className="preferences-section__heading"><span>04</span><div><h2>What should rise to the top?</h2><p>Choose multiple discovery interests, or leave them open for a balanced demo.</p></div></div>
          <div className="preferences-choice-grid preferences-choice-grid--wide">
            {DISCOVERY_OPTIONS.map(({ id, label }) => <Choice key={id} label={label} selected={preferences.discovery.includes(id)} onToggle={() => update({ discovery: toggle(preferences.discovery, id) })} />)}
          </div>
        </section>

        <section className="preferences-section preferences-section--name">
          <div className="preferences-section__heading"><span>05</span><div><h2>What should we call you?</h2><p>This friendly name is stored locally and is not an account identity.</p></div></div>
          <label className="form-field" htmlFor="demo-name">Display name
            <input id="demo-name" maxLength={32} value={preferences.displayName} onChange={(event) => update({ displayName: event.target.value })} placeholder="Movie fan" />
          </label>
        </section>

        <div className="preferences-actions">
          <button className="button button--primary" type="submit"><Check size={16} /> Save demo preferences</button>
          <Link to="/" className="button button--secondary"><SlidersHorizontal size={15} /> Keep browsing</Link>
          {saved && <span className="preferences-status" role="status">Saved in this browser.</span>}
          {storageError && <span className="preferences-status preferences-status--error" role="alert">Browser storage is unavailable. These preferences could not be saved.</span>}
        </div>
      </form>
    </div>
  );
}

function Choice({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return <label className={`preference-choice${selected ? ' is-selected' : ''}`}>
    <input type="checkbox" checked={selected} onChange={onToggle} />
    <span>{label}</span>
    <i aria-hidden="true">{selected ? '✓' : '+'}</i>
  </label>;
}

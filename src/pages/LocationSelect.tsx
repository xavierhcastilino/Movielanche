import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LocateFixed, MapPin, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { DEMO_CITIES, getDemoPreferences, saveDemoPreferences } from '../utils/preferences';

export function LocationSelect() {
  const navigate = useNavigate();
  const [city, setCity] = useState(() => getDemoPreferences().city);
  const [locationMessage, setLocationMessage] = useState('');
  const useLocation = () => {
    setLocationMessage('Checking your browser location…');
    if (!navigator.geolocation) { setCity('Belagavi'); setLocationMessage('Location is unavailable here, so we used the Belagavi demo theatres.'); return; }
    navigator.geolocation.getCurrentPosition(() => { setCity('Belagavi'); setLocationMessage('Location found · showing the Belagavi demo theatre network.'); }, () => { setCity('Belagavi'); setLocationMessage('Location permission was not available, so we used the Belagavi demo network.'); }, { timeout: 5000 });
  };
  const continueToTheatres = () => { saveDemoPreferences({ ...getDemoPreferences(), city }); navigate('/onboarding/theatres'); };

  return (
    <OnboardingLayout step="03 / 04" eyebrow="SET YOUR CINEMA LOCATION">
      <section className="onboarding-step location-step">
        <div className="onboarding-step__heading"><div><h1>Where are you watching?</h1><p>Choose a city so the dashboard can surface the nearest demo theatres and showtimes.</p></div><span className="location-step__pin"><MapPin size={18} /></span></div>
        <button className="location-detect" type="button" onClick={useLocation}><LocateFixed size={17} /><span><strong>Allow location access</strong><small>Use your browser location once to suggest a city</small></span><ArrowRight size={15} /></button>
        {locationMessage && <p className="location-status" role="status"><Navigation size={13} /> {locationMessage}</p>}
        <div className="city-grid" role="radiogroup" aria-label="Choose your city">
          {DEMO_CITIES.map((item) => <button className={`city-card${city === item ? ' is-selected' : ''}`} key={item} type="button" role="radio" aria-checked={city === item} onClick={() => { setCity(item); setLocationMessage(''); }}><span className="city-card__art"><MapPin size={20} /></span><span><strong>{item}</strong><small>{item === 'Belagavi' ? '3 demo theatres nearby' : 'Discovery mode · theatre data coming soon'}</small></span><i>{city === item ? <Check size={15} /> : '+'}</i></button>)}
        </div>
        <div className="onboarding-actions"><button className="button button--ghost" type="button" onClick={() => navigate('/onboarding/genres')}><ArrowLeft size={14} /> Back</button><button className="button button--primary" type="button" onClick={continueToTheatres}>Show nearby theatres <ArrowRight size={15} /></button></div>
      </section>
    </OnboardingLayout>
  );
}

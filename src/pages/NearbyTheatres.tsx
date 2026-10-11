import { ArrowLeft, ArrowRight, Check, MapPin, Navigation, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { theatres } from '../data/theatres';
import { completeOnboarding } from '../utils/onboarding';
import { getDemoPreferences } from '../utils/preferences';

export function NearbyTheatres() {
  const navigate = useNavigate();
  const { city } = getDemoPreferences();
  const nearby = theatres.filter((theatre) => theatre.city === city);
  const enterDashboard = () => { completeOnboarding(); navigate('/'); };

  return (
    <OnboardingLayout step="04 / 04" eyebrow="YOUR LOCAL CINEMA NETWORK">
      <section className="onboarding-step theatres-step">
        <div className="onboarding-step__heading"><div><h1>Places to settle in.</h1><p>Here’s what is available near <strong>{city}</strong> in this local demo.</p></div><span className="location-step__pin"><Check size={18} /></span></div>
        {nearby.length ? <div className="nearby-theatre-list">{nearby.map((theatre, index) => <article className="nearby-theatre-card" key={theatre.id}><span className="nearby-theatre-card__index">0{index + 1}</span><div className="nearby-theatre-card__icon"><Ticket size={18} /></div><div className="nearby-theatre-card__copy"><strong>{theatre.name}</strong><span><MapPin size={12} /> {theatre.area}, {theatre.city} · {theatre.distance}</span><small>{theatre.formats.join(' · ')} · {theatre.screen}</small></div><span className="nearby-theatre-card__state"><Navigation size={12} /> Ready</span></article>)}</div> : <div className="nearby-empty"><MapPin size={20} /><strong>Discovery mode is ready.</strong><p>There are no seeded theatre listings for {city} yet, but the catalogue is still available.</p></div>}
        <div className="onboarding-actions"><button className="button button--ghost" type="button" onClick={() => navigate('/onboarding/location')}><ArrowLeft size={14} /> Change city</button><button className="button button--primary" type="button" onClick={enterDashboard}>Enter dashboard <ArrowRight size={15} /></button></div>
      </section>
    </OnboardingLayout>
  );
}

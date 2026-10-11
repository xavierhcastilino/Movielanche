import { useState } from 'react';
import { LogOut, MapPin, Menu, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDemoPreferences } from '../hooks/useDemoPreferences';
import { logoutDemoSession } from '../utils/onboarding';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Movies', to: '/movies' },
  { label: 'Bookings', to: '/bookings' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const preferences = useDemoPreferences();
  const handleLogout = () => { logoutDemoSession(); setMenuOpen(false); navigate('/auth'); };

  return (
    <header className="site-header">
      <div className="site-header__inner page-wrap">
        <Link to="/" className="brand" aria-label="MOVIELANCHE home" onClick={() => setMenuOpen(false)}>
          <img className="brand__mark" src="/brand/emblem.png" alt="" />
          <span className="brand__word">MOVIE<span>LANCHE</span><small>AN AVALANCHE OF MOVIES.</small></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'main-nav__link is-active' : 'main-nav__link'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="site-header__tools">
          <span className="location-label" title="Location is a locally saved demo preference"><MapPin size={14} aria-hidden="true" /><span>{preferences.city}</span></span>
          <Link to="/movies" className="icon-button" aria-label="Search movies"><Search size={18} /></Link>
          <Link to="/profile" className="profile-button" aria-label="Edit local demo profile preferences"><SlidersHorizontal size={16} /><span>Preferences</span></Link>
          <button type="button" className="logout-button" aria-label="Log out of this demo" onClick={handleLogout}><LogOut size={15} /><span>Log out</span></button>
          <button type="button" className="icon-button menu-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

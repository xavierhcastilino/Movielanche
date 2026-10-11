import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-wrap site-footer__top">
        <div>
          <Link to="/" className="footer-brand"><span className="brand__mark" aria-hidden="true"><i /><i /><i /></span> MOVIELANCHE</Link>
          <p className="site-footer__tagline">AN AVALANCHE OF MOVIES.</p>
          <p className="site-footer__note">A better seat for your next great story.</p>
        </div>
        <div className="site-footer__links">
          <div><span className="eyebrow">ABOUT</span><Link to="/movies">Movies</Link><Link to="/bookings">Bookings</Link><Link to="/profile">Local preferences</Link></div>
          <div><span className="eyebrow">INFO</span><a href="/#about">Why Movielanche</a><a href="/#credits">Credits</a></div>
        </div>
      </div>
      <div id="credits" className="page-wrap site-footer__bottom">
        <span>© 2026 MOVIELANCHE · A TECH FEST PROTOTYPE</span>
        <span>Movie artwork and metadata from TMDB. This product is not endorsed or certified by TMDB.</span>
      </div>
    </footer>
  );
}

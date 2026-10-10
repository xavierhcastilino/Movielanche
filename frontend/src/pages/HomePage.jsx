import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Play,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import MovieCard from "../components/MovieCard.jsx";

export default function HomePage() {
  const movies = [
    {
      title: "Dune: Part Two",
      genre: "SCI-FI · ADVENTURE",
      rating: "8.8",
      year: "2024",
      art: "dune",
      tag: "IMAX EXPERIENCE",
      description: "The future is written in the sand.",
    },
    {
      title: "The Batman",
      genre: "ACTION · CRIME",
      rating: "8.1",
      year: "2022",
      art: "batman",
      tag: "DARK & GRITTY",
      description: "Unmask the truth.",
    },
    {
      title: "Interstellar",
      genre: "SCI-FI · DRAMA",
      rating: "8.7",
      year: "2014",
      art: "interstellar",
      tag: "FAN FAVOURITE",
      description: "Mankind was born on Earth. It was never meant to die here.",
    },
    {
      title: "Oppenheimer",
      genre: "DRAMA · HISTORY",
      rating: "8.3",
      year: "2023",
      art: "oppenheimer",
      tag: "AWARD WINNER",
      description: "The world forever changes.",
    },
  ];
  const upcoming = [
    { title: "Beyond the Blue", date: "COMING NOV 14", art: "blue" },
    { title: "The Last Signal", date: "COMING NOV 21", art: "signal" },
    { title: "Neon Horizon", date: "COMING DEC 05", art: "neon" },
  ];

  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="home-page" id="home">
      <nav className="nav-shell">
        <a className="wordmark" href="#home" aria-label="MovieLanche home">
          <span className="logo-mark">
            <Clapperboard size={19} />
          </span>
          MOVIE<span>LANCHE</span>
        </a>
        <div className="nav-links">
          <a className="active" href="#home">
            Home
          </a>
          <a href="#now-showing">Movies</a>
          <a href="#cinemas">Cinemas</a>
          <a href="#coming-soon">Coming Soon</a>
        </div>
        <div className="nav-actions">
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search movies"
              placeholder="Find a movie"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="icon-button"
            aria-label="Saved movies"
            onClick={() => setSaved(!saved)}
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            className="sign-in"
            onClick={() =>
              window.alert("Sign in is a placeholder in this demo.")
            }
          >
            Sign in <UserRound size={15} />
          </button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-backdrop" />
        <div className="hero-orb orb-one" />
        <div className="hero-orb orb-two" />
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE BIG SCREEN, REIMAGINED
          </div>
          <h1>
            Stories worth
            <br />
            <em>stepping into.</em>
          </h1>
          <p>
            Find your next obsession. From edge-of-your-seat premieres to the
            stories that stay with you long after the credits roll.
          </p>
          <div className="hero-meta">
            <span>✦ CURATED FOR YOU</span>
            <span className="meta-dot" />
            <span>NEW EXPERIENCES WEEKLY</span>
          </div>
          <div className="hero-buttons">
            <a href="#now-showing" className="button-primary">
              Explore movies <ArrowRight size={17} />
            </a>
            <button
              className="button-ghost"
              onClick={() =>
                window.alert("Trailer playback is a demo placeholder.")
              }
            >
              <Play size={15} /> Watch trailer
            </button>
          </div>
        </div>
        <div className="hero-feature-card">
          <span className="feature-label">YOUR NEXT MOVIE NIGHT</span>
          <div className="feature-icon">
            <Ticket size={20} />
          </div>
          <strong>Make it a moment.</strong>
          <span>Great stories. Better seats.</span>
          <a href="#now-showing">
            Find a film <ChevronRight size={14} />
          </a>
        </div>
        <div className="hero-index">
          <span>01</span>
          <i />
          <span>04</span>
        </div>
      </section>

      <section className="section movie-section" id="now-showing">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> THE LINEUP
            </div>
            <h2>
              Now <em>showing.</em>
            </h2>
            <p>Big-screen stories. Handpicked for your next night out.</p>
          </div>
          <a className="text-link" href="#now-showing">
            View all films <ArrowRight size={16} />
          </a>
        </div>
        {filtered.length ? (
          <div className="movie-grid">
            {filtered.map((movie) => (
              <MovieCard key={movie.title} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No demo movies match “{query}”. Try another title.
          </div>
        )}
      </section>

      <section className="midnight-banner" id="cinemas">
        <div className="banner-glow" />
        <div className="banner-content">
          <span className="eyebrow">
            <span className="eyebrow-line" /> MORE THAN A MOVIE
          </span>
          <h2>
            Make room for
            <br />
            <em>the extraordinary.</em>
          </h2>
          <p>
            Sound that surrounds you. Screens that pull you in. Moments that
            deserve the big screen.
          </p>
          <button
            className="button-primary"
            onClick={() =>
              window.alert("Cinema discovery is a demo placeholder.")
            }
          >
            Discover the experience <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-stamp">
          <Clapperboard size={29} />
          <span>
            YOUR SEAT
            <br />
            IS WAITING
          </span>
        </div>
      </section>

      <section className="section coming-section" id="coming-soon">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> ON THE HORIZON
            </div>
            <h2>
              Coming <em>soon.</em>
            </h2>
            <p>Keep these dates open. Something special is on its way.</p>
          </div>
          <span className="calendar-note">
            <CalendarDays size={16} /> YOUR WATCHLIST STARTS HERE
          </span>
        </div>
        <div className="upcoming-grid">
          {upcoming.map((movie) => (
            <MovieCard key={movie.title} movie={movie} upcomingMovie />
          ))}
        </div>
      </section>

      <footer className="footer">
        <a className="wordmark" href="#home">
          <span className="logo-mark">
            <Clapperboard size={18} />
          </span>
          MOVIE<span>LANCHE</span>
        </a>
        <p>For the love of the big screen.</p>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#now-showing">Movies</a>
          <a href="#cinemas">Cinemas</a>
          <a href="#coming-soon">Coming soon</a>
        </div>
        <small>© 2026 MOVIELANCHE. MADE FOR MOVIE PEOPLE.</small>
      </footer>
    </main>
  );
}

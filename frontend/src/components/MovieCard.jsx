import { Play } from "lucide-react";

export default function MovieCard({ movie, upcomingMovie = false }) {
  return (
    <article className={`movie-card ${upcomingMovie ? "upcoming-card" : ""}`}>
      <div className={`poster-art art-${movie.art}`}>
        <div className="poster-grain" />
        <span className="poster-kicker">{movie.tag || "COMING SOON"}</span>
        <div className="poster-title">{movie.title}</div>
        <span className="poster-bottom">{movie.year || movie.date}</span>
        {!upcomingMovie && (
          <button
            className="poster-play"
            aria-label={`Preview ${movie.title}`}
            onClick={() =>
              window.alert(`Preview for ${movie.title} — demo interaction.`)
            }
          >
            <Play size={16} fill="currentColor" />
          </button>
        )}
      </div>
      <div className="movie-card-info">
        <div>
          <h3>{movie.title}</h3>
          <p>{upcomingMovie ? movie.date : movie.genre}</p>
        </div>
        {!upcomingMovie && <span className="rating">★ {movie.rating}</span>}
      </div>
    </article>
  );
}

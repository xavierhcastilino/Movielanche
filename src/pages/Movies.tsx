import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { MovieCard } from '../components/MovieCard';
import { getMovies } from '../services/api';
import type { Genre, Language, Movie, MovieStatus } from '../types/movie';

const genres: Array<'All' | Genre> = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Animation'];
const languages: Array<'All' | Language> = ['All', 'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'];
type Category = 'All films' | 'Trending' | 'Now showing' | 'Coming soon' | 'Recent releases' | 'Older films' | 'Classics';
type SortMode = 'featured' | 'rating' | 'newest' | 'oldest' | 'title';
const categories: Category[] = ['All films', 'Trending', 'Now showing', 'Coming soon', 'Recent releases', 'Older films', 'Classics'];
const PAGE_SIZE = 8;

export function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [genre, setGenre] = useState<'All' | Genre>('All');
  const [language, setLanguage] = useState<'All' | Language>('All');
  const [category, setCategory] = useState<Category>('All films');
  const [year, setYear] = useState('All');
  const [sort, setSort] = useState<SortMode>('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMovies().then(setMovies).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(query.trim().toLowerCase()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const years = useMemo(() => [...new Set(movies.map((movie) => movie.releaseDate.slice(0, 4)))].sort((a, b) => Number(b) - Number(a)), [movies]);
  const filtered = useMemo(() => {
    const results = movies.filter((movie) => {
      const releaseYear = Number(movie.releaseDate.slice(0, 4));
      const matchesQuery = !searchTerm || `${movie.title} ${movie.genres.join(' ')} ${movie.language}`.toLowerCase().includes(searchTerm);
      const matchesGenre = genre === 'All' || movie.genres.includes(genre);
      const matchesLanguage = language === 'All' || movie.language === language;
      const status: MovieStatus | undefined = category === 'Now showing' || category === 'Trending' ? 'now-showing' : category === 'Coming soon' ? 'coming-soon' : undefined;
      const matchesPeriod = category === 'Recent releases' ? releaseYear >= 2020 : category === 'Older films' ? releaseYear >= 2000 && releaseYear < 2020 : category === 'Classics' ? releaseYear < 2000 : true;
      return matchesQuery && matchesGenre && matchesLanguage && (!status || movie.status === status) && matchesPeriod && (year === 'All' || String(releaseYear) === year);
    });
    return results.sort((a, b) => {
      if (sort === 'rating' || category === 'Trending') return b.rating - a.rating;
      if (sort === 'newest') return b.releaseDate.localeCompare(a.releaseDate);
      if (sort === 'oldest') return a.releaseDate.localeCompare(b.releaseDate);
      if (sort === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [movies, searchTerm, genre, language, category, year, sort]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchTerm, genre, language, category, year, sort]);
  const clearFilters = () => { setQuery(''); setSearchTerm(''); setGenre('All'); setLanguage('All'); setCategory('All films'); setYear('All'); setSort('featured'); };
  const hasFilters = Boolean(searchTerm || genre !== 'All' || language !== 'All' || category !== 'All films' || year !== 'All' || sort !== 'featured');
  const visibleMovies = filtered.slice(0, visibleCount);

  return (
    <div className="page-wrap inner-page explore-page">
      <header className="page-heading page-heading--split">
        <div><p className="eyebrow">THE MOVIELANCHE COLLECTION</p><h1>Explore movies<span className="heading-period">.</span></h1><p>Find something worth watching.</p></div>
        <span className="page-heading__index">LOCAL DEMO <i /> {movies.length} FILM RECORDS</span>
      </header>
      <p className="catalogue-disclosure">A curated local prototype catalogue with TMDB-sourced artwork and metadata—not a live or exhaustive movie feed.</p>
      <section className="movie-filters" aria-label="Movie search and filters">
        <label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search movies</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies..." /></label>
        <label className="filter-select"><SlidersHorizontal size={15} aria-hidden="true" /><span className="sr-only">Filter by language</span><select value={language} onChange={(event) => setLanguage(event.target.value as 'All' | Language)}>{languages.map((item) => <option key={item} value={item}>{item === 'All' ? 'All languages' : item}</option>)}</select></label>
        <label className="filter-select"><span className="sr-only">Filter by release year</span><select aria-label="Filter by release year" value={year} onChange={(event) => setYear(event.target.value)}><option value="All">All years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="filter-select"><span className="sr-only">Sort movie results</span><select aria-label="Sort movie results" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="featured">Featured order</option><option value="rating">Rating: highest</option><option value="newest">Release: newest</option><option value="oldest">Release: oldest</option><option value="title">Title: A–Z</option></select></label>
      </section>
      <div className="category-tabs" role="tablist" aria-label="Movie category">
        {categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? 'category-tab is-active' : 'category-tab'} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="genre-filters" role="group" aria-label="Filter by genre">
        {genres.map((item) => <button key={item} type="button" className={genre === item ? 'filter-chip is-active' : 'filter-chip'} aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</button>)}
      </div>
      <div className="results-heading"><span>Showing {visibleMovies.length} of {filtered.length} matching {filtered.length === 1 ? 'film' : 'films'}</span><span>Belagavi sample collection{hasFilters && <button className="clear-filters" type="button" onClick={clearFilters}><RotateCcw size={12} /> Clear filters</button>}</span></div>
      {loading ? <LoadingState label="Loading the collection…" /> : filtered.length ? <>
        <div className="movie-grid">{visibleMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
        {visibleCount < filtered.length && <div className="load-more-wrap"><button className="button button--secondary" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load more local films</button></div>}
      </> : <EmptyState title="No movies found." description={category === 'Classics' ? 'No pre-2000 classics are included in this local demo collection yet.' : 'Try a different title, release year, genre or language.'} />}
    </div>
  );
}

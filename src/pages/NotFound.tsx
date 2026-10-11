import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFound() {
  return <div className="page-wrap inner-page not-found-page"><p className="eyebrow">404 · WRONG SCREEN</p><EmptyState title="This page isn't in the programme." description="Head back to the collection and choose another story." /><Link to="/movies" className="button button--primary">Explore movies</Link></div>;
}

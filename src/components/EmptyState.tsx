import { Clapperboard } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon"><Clapperboard size={23} aria-hidden="true" /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

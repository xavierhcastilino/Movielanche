import { Clapperboard } from 'lucide-react';

interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return <div className="loading-state" role="status"><Clapperboard size={17} aria-hidden="true" /><span>{label}</span></div>;
}

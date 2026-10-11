import { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  loading?: 'eager' | 'lazy';
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackLabel = 'MOVIELANCHE',
  loading = 'lazy',
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div className={`image-fallback ${className}`} role="img" aria-label={`${alt} — artwork unavailable`}>
        <Clapperboard size={26} aria-hidden="true" />
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

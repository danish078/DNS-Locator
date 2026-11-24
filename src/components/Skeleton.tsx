interface SkeletonBlockProps {
  className?: string;
  tone?: 'slate' | 'emerald' | 'sky';
}

export function SkeletonBlock({ className = '', tone = 'slate' }: SkeletonBlockProps) {
  const toneClass =
    tone === 'emerald'
      ? 'skeleton-shimmer-emerald'
      : tone === 'sky'
        ? 'skeleton-shimmer-sky'
        : 'skeleton-shimmer';

  return <div aria-hidden="true" className={`${toneClass} ${className}`} />;
}

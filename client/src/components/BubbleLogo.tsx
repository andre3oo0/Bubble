import { useId } from 'react';

// The app's mark: a soap bubble with a highlight. `withName` adds the wordmark.
export default function BubbleLogo({ size = 32, withName = false }: { size?: number; withName?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-fill`} cx="0.38" cy="0.34" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#c9ecff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#6fc1ee" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" fill={`url(#${id}-fill)`} stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.5" />
        <ellipse cx="11" cy="10.5" rx="4.2" ry="2.6" transform="rotate(-35 11 10.5)" fill="#ffffff" opacity="0.9" />
        <circle cx="22.5" cy="21.5" r="1.6" fill="#ffffff" opacity="0.6" />
      </svg>
      {withName && <span className="text-xl font-semibold tracking-tight text-white">Bubble</span>}
    </span>
  );
}

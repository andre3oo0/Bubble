import { BUBBLE_COLOURS } from './BubbleAvatar';

// The app's mark: a bubble inside a ring. Light on Bubble's dark backgrounds.
// `withName` adds the wordmark.
export default function BubbleLogo({ size = 32, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r="22" fill="none" stroke={BUBBLE_COLOURS.accent} strokeWidth="2" />
        <circle cx="24" cy="24" r="16" fill={BUBBLE_COLOURS.fill} />
        <ellipse cx="18.5" cy="17.5" rx="4" ry="2.3" transform="rotate(-35 18.5 17.5)" fill={BUBBLE_COLOURS.shine} />
      </svg>
      {withName && <span className="text-xl font-semibold tracking-tight text-white">Bubble</span>}
    </span>
  );
}

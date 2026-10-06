import type { ReactNode } from 'react';
import { Mood } from '@/models/types';

// Bubble's face: a flat, still bubble with a different expression for each mood,
// plus "listening" and "thinking". Drawn on a 64-unit grid in Bubble's own colours.
export const BUBBLE_COLOURS = {
  fill: '#C9ECFF',
  ring: '#8CCBEB',
  accent: '#5BAEDC',
  ink: '#0B3D66',
  shine: '#FFFFFF',
};

export type BubbleFace = Mood | 'listening' | 'thinking';

const { fill, ring, accent, ink, shine } = BUBBLE_COLOURS;
const line = {
  fill: 'none',
  stroke: ink,
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
const eyes = (y: number, r = 2.1, x1 = 26, x2 = 38) => (
  <>
    <circle cx={x1} cy={y} r={r} fill={ink} />
    <circle cx={x2} cy={y} r={r} fill={ink} />
  </>
);

const FACES: Record<BubbleFace, ReactNode> = {
  happy: (
    <>
      <circle cx="20.5" cy="38.5" r="2.4" fill={ring} />
      <circle cx="43.5" cy="38.5" r="2.4" fill={ring} />
      <path d="M23.5 34 q2.5 -3 5 0 M35.5 34 q2.5 -3 5 0 M27 39 q5 5 10 0" {...line} />
    </>
  ),
  calm: <path d="M23.5 33 q2.5 2.6 5 0 M35.5 33 q2.5 2.6 5 0 M29 40 q3 2.2 6 0" {...line} />,
  sad: (
    <>
      <path d="M22.5 28.8 L27.5 27.4 M41.5 28.8 L36.5 27.4 M29 42 q3 -2 6 0" {...line} strokeWidth={2} />
      {eyes(34)}
    </>
  ),
  anxious: (
    <>
      <path d="M22.5 27.6 q2.5 -1.6 5 -0.6 M41.5 27.6 q-2.5 -1.6 -5 -0.6" {...line} strokeWidth={2} />
      <path d="M27.5 41 q1.5 -1.6 3 0 q1.5 1.6 3 0 q1.5 -1.6 3 0" {...line} strokeWidth={2} />
      {eyes(33, 2.6)}
    </>
  ),
  stressed: (
    <>
      <path d="M23.5 33.5 h5 M35.5 33.5 h5 M29.5 41 q2.5 -1 5 0" {...line} />
      <path d="M46 20 q-2.6 3.6 0 5.8 q2.6 -2.2 0 -5.8 z" fill={accent} />
    </>
  ),
  neutral: (
    <>
      {eyes(33)}
      <path d="M29.5 40.5 h5" {...line} />
    </>
  ),
  improved: (
    <>
      {eyes(32.5)}
      <path d="M28 39.5 q4 3.6 8 0" {...line} />
    </>
  ),
  listening: (
    <>
      {eyes(33)}
      <path d="M29 40 q3 2.2 6 0" {...line} />
    </>
  ),
  thinking: (
    <>
      {eyes(31.5, 2.1, 27.5, 39.5)}
      <path d="M30 41 h4" {...line} />
    </>
  ),
};

const SIZES = { sm: 40, md: 96, lg: 140 };

interface BubbleAvatarProps {
  mood?: Mood;
  size?: keyof typeof SIZES;
  // While Bubble is writing a reply
  isTyping?: boolean;
  // Overrides mood, e.g. "listening"
  face?: BubbleFace;
}

export default function BubbleAvatar({ mood = 'neutral', size = 'lg', isTyping = false, face }: BubbleAvatarProps) {
  const shown: BubbleFace = face ?? (isTyping ? 'thinking' : mood);
  const px = SIZES[size];
  return (
    <svg width={px} height={px} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="shrink-0">
      <circle cx="32" cy="32" r="30" fill="none" stroke={ring} strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25" fill={fill} />
      <ellipse cx="23" cy="21" rx="4.5" ry="2.6" transform="rotate(-35 23 21)" fill={shine} />
      {FACES[shown] ?? FACES.neutral}
    </svg>
  );
}

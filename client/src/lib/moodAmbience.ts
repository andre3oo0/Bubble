import type { Mood } from '@shared/chat';

// How the scene answers Bubble's mood: a soft tint over the drawing and the speed of
// its movement. It responds rather than mirrors: anxious, stressed and sad deepen the
// colours and slow the scene down to settle it; calm cools it a touch; happy and better
// liven the movement a little. Good moods get no tint: any warm colour over the blue
// scenes came out grey and dull rather than warmer (tried 7 October).
//
// The tints are dark and faint, so white text over the scene stays at AA under every
// one (contrast.test.ts checks each over every scene's lightest sky). No purple.
export interface Ambience {
  tint: string;
  // How much of the tint shows, 0 to 1
  strength: number;
  // Playback speed of the scene's movement; 1 is as drawn
  speed: number;
}

export const MOOD_AMBIENCE: Record<Mood, Ambience> = {
  neutral: { tint: '#000000', strength: 0, speed: 1 },
  happy: { tint: '#000000', strength: 0, speed: 1.15 },
  improved: { tint: '#000000', strength: 0, speed: 1.05 },
  calm: { tint: '#0e5a6e', strength: 0.16, speed: 0.85 },
  sad: { tint: '#10203a', strength: 0.28, speed: 0.75 },
  anxious: { tint: '#123c5c', strength: 0.24, speed: 0.6 },
  stressed: { tint: '#1f3a4f', strength: 0.24, speed: 0.6 },
};

// The colour a tint over `base` comes out as, for the contrast test
export function tinted(base: string, { tint, strength }: Ambience): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(base, i) * (1 - strength) + channel(tint, i) * strength).toString(16).padStart(2, '0'))
    .join('')}`;
}

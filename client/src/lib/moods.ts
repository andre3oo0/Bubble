import type { Mood } from '@shared/chat';

// One place for how moods are shown. Words, not emoji faces; the colours are muted
// so the mood history reads as a pattern without shouting.
export const MOOD_ORDER: Mood[] = ['happy', 'calm', 'improved', 'neutral', 'sad', 'anxious', 'stressed'];

export const MOOD_LABELS: Record<Mood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  improved: 'Better than before',
  neutral: 'Neutral',
  sad: 'Sad',
  anxious: 'Anxious',
  stressed: 'Stressed',
};

export const MOOD_TONES: Record<Mood, string> = {
  happy: '#d9b45a',
  calm: '#7fb3d5',
  improved: '#8fbf8a',
  neutral: '#a8b3bf',
  sad: '#93a7c7',
  anxious: '#d39a5c',
  stressed: '#dc8f82',
};

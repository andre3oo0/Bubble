import type { Mood } from '@shared/chat';
import type { FeelingTag, MoodLevel } from '@shared/checkin';

// One place for how moods are shown: words, not emoji faces
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

// Mood check-ins: the five steps, lowest first, and the optional feelings
export const LEVEL_LABELS: Record<MoodLevel, string> = {
  1: 'Really low',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Really good',
};

export const TAG_LABELS: Record<FeelingTag, string> = {
  happy: 'Happy',
  calm: 'Calm',
  hopeful: 'Hopeful',
  tired: 'Tired',
  anxious: 'Anxious',
  stressed: 'Stressed',
  overwhelmed: 'Overwhelmed',
  sad: 'Sad',
  lonely: 'Lonely',
  angry: 'Angry',
};

// "Good" or "Good · Tired, Hopeful"
export function describeCheckin(level: MoodLevel, tags: readonly FeelingTag[] = []): string {
  return tags.length ? `${LEVEL_LABELS[level]} · ${tags.map((tag) => TAG_LABELS[tag]).join(', ')}` : LEVEL_LABELS[level];
}

// The 14-day view's bars, in Bubble's accent on the dark panel
export const CHECKIN_BAR = '#5BAEDC';

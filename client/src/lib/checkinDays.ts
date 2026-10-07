import type { MoodCheckin } from '@shared/api';
import type { MoodLevel } from '@shared/checkin';
import { formatDay } from './dates';

export const VIEW_DAYS = 14;

export interface CheckinDay {
  // Midnight, local time
  date: Date;
  // "Today", "Yesterday", "Tue 6 Oct"
  label: string;
  // "T", for under the bar
  initial: string;
  count: number;
  // The day's average level, or null with no check-ins
  average: number | null;
  // The average rounded to the nearest step, for the words
  level: MoodLevel | null;
}

const LOCALE = 'en-ZA';

// The last `days` days, oldest first and ending today, with each day's check-ins
// averaged. Days without a check-in are kept, so gaps show as gaps.
export function checkinDays(checkins: readonly MoodCheckin[], now = new Date(), days = VIEW_DAYS): CheckinDay[] {
  const byDay = new Map<number, number[]>();
  for (const checkin of checkins) {
    const at = new Date(checkin.createdAt);
    const key = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
    byDay.set(key, [...(byDay.get(key) ?? []), checkin.level]);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - index));
    const levels = byDay.get(date.getTime()) ?? [];
    const average = levels.length ? levels.reduce((sum, level) => sum + level, 0) / levels.length : null;
    return {
      date,
      label: formatDay(date, now),
      initial: date.toLocaleDateString(LOCALE, { weekday: 'narrow' }),
      count: levels.length,
      average,
      level: average === null ? null : (Math.round(average) as MoodLevel),
    };
  });
}

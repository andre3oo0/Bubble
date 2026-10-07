import { describe, expect, it } from 'vitest';
import type { MoodCheckin } from '@shared/api';
import { checkinDays } from './checkinDays';

const now = new Date(2026, 9, 7, 15, 0); // Wed 7 Oct 2026, 15:00 local

function checkin(level: MoodCheckin['level'], at: Date): MoodCheckin {
  return { id: at.toISOString(), level, tags: [], createdAt: at.toISOString() };
}

describe('checkinDays', () => {
  it('covers the last 14 days, oldest first and ending today', () => {
    const days = checkinDays([], now);
    expect(days).toHaveLength(14);
    expect(days[0].date).toEqual(new Date(2026, 8, 24));
    expect(days[13].label).toBe('Today');
    expect(days[12].label).toBe('Yesterday');
    expect(days[11].label).toBe('Mon 5 Oct');
  });

  it("averages a day's check-ins and keeps empty days as gaps", () => {
    const days = checkinDays(
      [checkin(2, new Date(2026, 9, 7, 8, 0)), checkin(5, new Date(2026, 9, 7, 13, 0)), checkin(4, new Date(2026, 9, 5, 21, 30))],
      now,
    );
    expect(days[13]).toMatchObject({ count: 2, average: 3.5, level: 4 });
    expect(days[12]).toMatchObject({ count: 0, average: null, level: null });
    expect(days[11]).toMatchObject({ count: 1, average: 4, level: 4 });
  });

  it('leaves out check-ins older than the view', () => {
    const days = checkinDays([checkin(1, new Date(2026, 8, 20, 12, 0))], now);
    expect(days.every((day) => day.count === 0)).toBe(true);
  });
});

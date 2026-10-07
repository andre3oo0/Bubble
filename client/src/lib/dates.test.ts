import { describe, expect, it } from 'vitest';
import { dateTitle, formatDay, formatDayAndTime, formatTime } from './dates';

const now = new Date(2026, 9, 6, 18, 0); // Tuesday 6 October 2026

describe('dates', () => {
  it('uses the 24-hour clock', () => {
    expect(formatTime(new Date(2026, 9, 6, 15, 42))).toBe('15:42');
    expect(formatTime(new Date(2026, 9, 6, 9, 5))).toBe('09:05');
  });

  it('says Today and Yesterday', () => {
    expect(formatDay(new Date(2026, 9, 6, 0, 1), now)).toBe('Today');
    expect(formatDay(new Date(2026, 9, 5, 23, 59), now)).toBe('Yesterday');
  });

  it('puts the day before the month', () => {
    expect(formatDay(new Date(2026, 9, 1), now)).toBe('Thu 1 Oct');
    expect(formatDay(new Date(2025, 11, 24), now)).toBe('Wed 24 Dec 2025');
  });

  it('joins day and time', () => {
    expect(formatDayAndTime(new Date(2026, 9, 6, 15, 42), now)).toBe('Today, 15:42');
  });

  it('writes blank journal titles out in full', () => {
    expect(dateTitle(new Date(2026, 9, 6))).toBe('Tuesday 6 October');
  });
});

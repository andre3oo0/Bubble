// One way of writing dates and times across the app, in South African style:
// day before month, 24-hour clock. "Today" and "Yesterday" where they read better.

const LOCALE = 'en-ZA';

// "15:42"
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Today", "Yesterday", "Tue 6 Oct", or "Tue 6 Oct 2025" for another year
export function formatDay(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' });
  const month = date.toLocaleDateString(LOCALE, { month: 'short' });
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${weekday} ${date.getDate()} ${month}${year}`;
}

// "Today, 15:42"
export function formatDayAndTime(date: Date, now = new Date()): string {
  return `${formatDay(date, now)}, ${formatTime(date)}`;
}

// Used as a journal entry's title when it's left blank: "Tuesday 6 October"
export function dateTitle(date: Date): string {
  return `${date.toLocaleDateString(LOCALE, { weekday: 'long' })} ${date.getDate()} ${date.toLocaleDateString(LOCALE, { month: 'long' })}`;
}

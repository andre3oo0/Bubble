// Placeholder rows shaped like the real content, so the page doesn't jump when it
// arrives. The gentle pulse is an "animated-" class, so calm visuals turns it off.
const bar = 'animated-skeleton block rounded';

// Varied title widths so it reads as a list, not a pattern
const TITLE_WIDTHS = ['55%', '40%', '62%', '48%'];

export function JournalSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <span className="sr-only">Loading your journal</span>
      {TITLE_WIDTHS.map((width) => (
        <div key={width} aria-hidden="true" className="surface flex flex-col gap-2.5 rounded-3xl p-4">
          <span className={`${bar} h-4 bg-white/20`} style={{ width }} />
          <span className={`${bar} h-2.5 w-full bg-white/10`} />
          <span className={`${bar} mb-2 h-2.5 w-[70%] bg-white/10`} />
          <span className="flex justify-between">
            <span className={`${bar} h-3 w-14 bg-white/20`} />
            <span className={`${bar} h-3 w-16 bg-white/20`} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function MoodHistorySkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading your check-ins</span>
      <div aria-hidden="true">
        <span className={`${bar} mb-2 h-3.5 w-24 bg-white/20`} />
        <div className="divide-y divide-white/10">
          {['w-16', 'w-20', 'w-14'].map((width) => (
            <div key={width} className="flex items-center justify-between py-3">
              <span className={`${bar} h-3 w-12 bg-white/10`} />
              <span className={`${bar} h-3.5 ${width} bg-white/20`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex items-center gap-3 px-4 py-3">
      <span className="sr-only">Loading your account</span>
      <span aria-hidden="true" className="animated-skeleton block h-11 w-11 shrink-0 rounded-full bg-white/20" />
      <span aria-hidden="true" className="flex flex-1 flex-col gap-2">
        <span className={`${bar} h-3.5 w-28 bg-white/20`} />
        <span className={`${bar} h-3 w-44 bg-white/10`} />
      </span>
    </div>
  );
}

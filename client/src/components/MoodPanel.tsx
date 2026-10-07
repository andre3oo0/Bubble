import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MoodCheckin } from '@shared/api';
import { feelingTags, MAX_TAGS, MOOD_LEVELS, moodForCheckin, type FeelingTag, type MoodLevel } from '@shared/checkin';
import { useSession } from '@/lib/authClient';
import { fetchMoods, queryKeys, saveMoodCheckin } from '@/lib/api';
import { checkinDays, VIEW_DAYS } from '@/lib/checkinDays';
import { formatDay, formatTime } from '@/lib/dates';
import { CHECKIN_BAR, describeCheckin, LEVEL_LABELS, TAG_LABELS } from '@/lib/moods';
import { cn } from '@/lib/utils';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useToast } from '@/hooks/use-toast';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';
import { MoodHistorySkeleton } from './Skeleton';
import { buttonClass, chipClass, focusRing, noticeClass } from './ui/controls';

export default function MoodPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const { open: openAccount } = useAccountDialog();
  const { setCurrentMood } = useMoodStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Starts empty: a check-in is the person's own answer, never Bubble's guess from chat
  const [level, setLevel] = useState<MoodLevel | null>(null);
  const [tags, setTags] = useState<FeelingTag[]>([]);

  const moodsQuery = useQuery({ queryKey: queryKeys.moods, queryFn: fetchMoods, enabled: !!session });

  const clearForm = () => {
    setLevel(null);
    setTags([]);
  };

  const saveCheckin = useMutation({
    mutationFn: saveMoodCheckin,
    onSuccess: (checkin) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.moods });
      setCurrentMood(moodForCheckin(checkin.level, checkin.tags));
      clearForm();
      toast({ title: 'Check-in saved', description: `${describeCheckin(checkin.level, checkin.tags)}, ${formatTime(new Date(checkin.createdAt))}` });
    },
  });

  const toggleTag = (tag: FeelingTag) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));

  const signedOut = !session && !sessionPending;

  return (
    <div className="flex flex-col pb-2">
      <PageHeader title="Mood" />

      <div className="surface rounded-[8px] text-white">
        <section aria-labelledby="checkin-heading" className="p-4">
          <h2 id="checkin-heading" className="mb-3 text-lg font-semibold">
            How are you feeling right now?
          </h2>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-labelledby="checkin-heading">
            {MOOD_LEVELS.map((step) => (
              <button
                key={step}
                onClick={() => setLevel(step)}
                aria-pressed={level === step}
                className={cn(chipClass(level === step), 'min-h-14 justify-center px-1 text-center leading-tight')}
              >
                {LEVEL_LABELS[step]}
              </button>
            ))}
          </div>

          <h3 id="feelings-heading" className="mb-2 mt-5 text-sm font-semibold">
            Any feelings to add? <span className="font-normal text-white/75">Optional, up to {MAX_TAGS}</span>
          </h3>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="feelings-heading">
            {feelingTags.map((tag) => {
              const picked = tags.includes(tag);
              const full = !picked && tags.length >= MAX_TAGS;
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={picked}
                  disabled={full}
                  className={cn(chipClass(picked), full && 'opacity-50')}
                >
                  {TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>

          {signedOut ? (
            // Without an account the check-in goes to Bubble only, so its face and chat
            // follow it; nothing is saved
            <>
              <button
                onClick={() => {
                  if (!level) return;
                  setCurrentMood(moodForCheckin(level, tags));
                  toast({ title: `Bubble knows you're feeling ${feelingWords(level, tags)}`, description: 'Sign in to keep a history of your check-ins.' });
                  clearForm();
                }}
                disabled={!level}
                className={buttonClass({ className: 'mt-5' })}
              >
                Tell Bubble
              </button>
              <p className="mt-4 border-t border-white/15 pt-4 text-sm text-white/85">
                Sign in to save check-ins and see how your last two weeks have gone.
              </p>
              <button onClick={() => openAccount()} className={buttonClass({ variant: 'secondary', size: 'sm', className: 'mt-3' })}>
                Sign in or create an account
              </button>
            </>
          ) : (
            <>
              {saveCheckin.isError && (
                <p role="alert" className={`mt-3 ${noticeClass.error}`}>
                  Couldn't save your check-in. Check your connection and try again.
                </p>
              )}
              <button
                onClick={() => level && saveCheckin.mutate({ level, tags })}
                disabled={!level || saveCheckin.isPending}
                className={buttonClass({ className: 'mt-5' })}
              >
                {saveCheckin.isPending ? 'Saving…' : 'Save check-in'}
              </button>
            </>
          )}
        </section>

        {!signedOut && (
          <section aria-labelledby="history-heading" className="border-t border-white/15 p-4">
            <h2 id="history-heading" className="text-lg font-semibold">
              Your check-ins
            </h2>

            {moodsQuery.isPending ? (
              <MoodHistorySkeleton />
            ) : moodsQuery.isError ? (
              <EmptyState
                title="Couldn't load your check-ins"
                action={
                  <button onClick={() => moodsQuery.refetch()} className={buttonClass({ variant: 'secondary' })}>
                    Try again
                  </button>
                }
              >
                Check your connection and try again.
              </EmptyState>
            ) : moodsQuery.data.length === 0 ? (
              <p className="py-6 text-center text-white/85">No check-ins yet. Pick how you feel above and save it.</p>
            ) : (
              <>
                <LastTwoWeeks checkins={moodsQuery.data} />
                <CheckinList checkins={moodsQuery.data} />
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// "okay", "okay and lonely", "low, anxious and tired"
function feelingWords(level: MoodLevel, tags: FeelingTag[]): string {
  const words = [LEVEL_LABELS[level], ...tags.map((tag) => TAG_LABELS[tag])].map((word) => word.toLowerCase());
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0];
}

// Lines and labels at these steps; bars are drawn as a share of 5, so 1 still shows
const GUIDES: MoodLevel[] = [5, 3, 1];

// One bar per day, the day's average. Tapping or focusing a day shows it in words
// underneath, which also works for screen readers and on phones (no hover there).
function LastTwoWeeks({ checkins }: { checkins: MoodCheckin[] }) {
  const days = checkinDays(checkins);
  const [selected, setSelected] = useState(days.length - 1);
  const day = days[selected];
  const detail = day.level
    ? `${LEVEL_LABELS[day.level]}${day.count > 1 ? `, the average of ${day.count} check-ins` : ''}`
    : 'No check-in';

  return (
    <div className="mt-1">
      <p className="mb-3 text-sm text-white/75">The last {VIEW_DAYS} days. Each bar is a day; taller is better.</p>
      <div className="flex gap-2">
        {/* Step labels, lined up with the guide lines */}
        <div className="relative h-32 w-[4.5rem] shrink-0 text-[11px] text-white/75" aria-hidden="true">
          {GUIDES.map((step) => (
            <span key={step} className="absolute right-0 translate-y-1/2 whitespace-nowrap" style={{ bottom: `${(step / 5) * 100}%` }}>
              {LEVEL_LABELS[step]}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-32">
            {GUIDES.map((step) => (
              <div key={step} className="absolute inset-x-0 border-t border-white/10" style={{ bottom: `${(step / 5) * 100}%` }} aria-hidden="true" />
            ))}
            <div className="relative flex h-full items-end gap-[2px]" role="group" aria-label={`Your last ${VIEW_DAYS} days`}>
              {days.map((d, index) => (
                <button
                  key={d.date.getTime()}
                  onClick={() => setSelected(index)}
                  onMouseEnter={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  aria-pressed={selected === index}
                  aria-label={`${d.label}: ${d.level ? LEVEL_LABELS[d.level] : 'no check-in'}`}
                  className={cn('flex h-full flex-1 items-end rounded-[4px] focus:outline-none', focusRing.dark, selected === index && 'bg-white/10')}
                >
                  {d.average === null ? (
                    <span className="block h-[2px] w-full bg-white/25" />
                  ) : (
                    <span
                      className="block w-full rounded-t-[4px]"
                      style={{ height: `${(d.average / 5) * 100}%`, backgroundColor: CHECKIN_BAR }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px] text-center text-[11px] text-white/75" aria-hidden="true">
            {days.map((d, index) => (
              <span key={d.date.getTime()} className={cn('flex-1', index === days.length - 1 && 'font-semibold text-white')}>
                {d.initial}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        <span className="font-semibold">{day.label}</span>
        <span className="text-white/85"> · {detail}</span>
      </p>
    </div>
  );
}

// Newest first, grouped by day: the same check-ins as the bars, as words
function CheckinList({ checkins }: { checkins: MoodCheckin[] }) {
  const groups = [...checkins]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .reduce<Record<string, MoodCheckin[]>>((acc, checkin) => {
      (acc[formatDay(new Date(checkin.createdAt))] ??= []).push(checkin);
      return acc;
    }, {});

  return (
    <div className="mt-6 space-y-5 border-t border-white/15 pt-4">
      <p className="text-sm text-white/75">Every check-in from the last 30 days</p>
      {Object.entries(groups).map(([day, rows]) => (
        <section key={day} aria-label={day}>
          <h3 className="mb-1 text-sm font-semibold text-white/85">
            {day}
            <span className="font-normal text-white/70">
              {' '}· {rows.length} {rows.length === 1 ? 'check-in' : 'check-ins'}
            </span>
          </h3>
          <ul className="divide-y divide-white/10">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 py-2">
                <span className="whitespace-nowrap text-sm text-white/85">{formatTime(new Date(row.createdAt))}</span>
                <span className="text-right">
                  <span className="font-medium">{LEVEL_LABELS[row.level]}</span>
                  {row.tags.length > 0 && (
                    <span className="block text-sm text-white/75">{row.tags.map((tag) => TAG_LABELS[tag]).join(', ')}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Mood } from '@/models/types';
import { useSession } from '@/lib/authClient';
import { fetchMoods, queryKeys, saveMoodCheckin } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/dates';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useToast } from '@/hooks/use-toast';
import { MOOD_LABELS, MOOD_ORDER, MOOD_TONES } from '@/lib/moods';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';
import { MoodHistorySkeleton } from './Skeleton';
import { buttonClass, chipClass, noticeClass } from './ui/controls';

interface CheckInRow {
  id: string;
  day: string;
  time: string;
  mood: Mood;
}

export default function MoodPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const { open: openAccount } = useAccountDialog();
  const { setCurrentMood } = useMoodStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Starts empty: a check-in is the person's own answer, never Bubble's guess from chat
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const moodsQuery = useQuery({ queryKey: queryKeys.moods, queryFn: fetchMoods, enabled: !!session });

  const saveCheckin = useMutation({
    mutationFn: saveMoodCheckin,
    onSuccess: (checkin) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.moods });
      setCurrentMood(checkin.mood);
      setSelectedMood(null);
      toast({ title: 'Check-in saved', description: `${MOOD_LABELS[checkin.mood]}, ${formatTime(new Date(checkin.createdAt))}` });
    },
  });

  // Newest first, grouped by day
  const groups = [...(moodsQuery.data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .reduce<Record<string, CheckInRow[]>>((acc, checkin) => {
      const at = new Date(checkin.createdAt);
      const day = formatDay(at);
      (acc[day] ??= []).push({ id: checkin.id, day, time: formatTime(at), mood: checkin.mood });
      return acc;
    }, {});

  const signedOut = !session && !sessionPending;

  return (
    <div className="flex flex-col pb-2">
      <PageHeader title="Mood" />

      <div className="surface rounded-[8px] text-white">
        <section aria-labelledby="checkin-heading" className="p-4">
          <h2 id="checkin-heading" className="mb-3 text-lg font-semibold">
            How are you feeling right now?
          </h2>
          {signedOut ? (
            <>
              <p className="text-white/85">Sign in to save check-ins and look back on how you've felt.</p>
              <button onClick={() => openAccount()} className={buttonClass({ className: 'mt-4' })}>
                Sign in or create an account
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="checkin-heading">
                {MOOD_ORDER.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    aria-pressed={selectedMood === mood}
                    className={chipClass(selectedMood === mood)}
                  >
                    {MOOD_LABELS[mood]}
                  </button>
                ))}
              </div>
              {saveCheckin.isError && (
                <p role="alert" className={`mt-3 ${noticeClass.error}`}>
                  Couldn't save your check-in. Check your connection and try again.
                </p>
              )}
              <button
                onClick={() => selectedMood && saveCheckin.mutate(selectedMood)}
                disabled={!selectedMood || saveCheckin.isPending}
                className={buttonClass({ className: 'mt-4' })}
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
            <p className="mb-3 text-sm text-white/75">The last 30 days</p>

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
            ) : Object.keys(groups).length === 0 ? (
              <p className="py-6 text-center text-white/85">No check-ins yet. Pick how you feel above and save it.</p>
            ) : (
              <div className="space-y-5">
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
                        <li key={row.id} className="flex items-center justify-between gap-4 py-2">
                          <span className="whitespace-nowrap text-sm text-white/85">{row.time}</span>
                          <span className="font-medium" style={{ color: MOOD_TONES[row.mood] }}>
                            {MOOD_LABELS[row.mood]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

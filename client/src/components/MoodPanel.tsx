import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mood } from '@/models/types';
import { Save } from 'lucide-react';
import { useSession } from '@/lib/authClient';

import { fetchMoods, queryKeys, saveMoodCheckin } from '@/lib/api';
import { useAccountDialog } from '@/store/accountStore';
import { MOOD_LABELS, MOOD_ORDER, MOOD_TONES } from '@/lib/moods';
import { MoodHistorySkeleton } from './Skeleton';

interface MoodCheckIn {
  id: string;
  date: string;
  time: string;
  mood: Mood;
}

interface MoodPanelProps {
  currentMood: Mood;
  setCurrentMood: (mood: Mood) => void;
}

export default function MoodPanel({ currentMood, setCurrentMood }: MoodPanelProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const { open: openAccount } = useAccountDialog();
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<Mood>(currentMood);

  const moodsQuery = useQuery({ queryKey: queryKeys.moods, queryFn: fetchMoods, enabled: !!session });
  const moodHistory: MoodCheckIn[] = (moodsQuery.data ?? []).map((checkin) => {
    const at = new Date(checkin.createdAt);
    return {
      id: checkin.id,
      date: at.toLocaleDateString(),
      time: at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood: checkin.mood,
    };
  });

  const saveCheckin = useMutation({
    mutationFn: saveMoodCheckin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.moods }),
  });

  // Save mood when selected
  const saveMood = () => {
    if (selectedMood) {
      // Bubble's mood updates either way; history needs an account
      setCurrentMood(selectedMood);
      if (session) saveCheckin.mutate(selectedMood);
    }
  };

  // Group mood history by date
  const groupedHistory = moodHistory.reduce((groups: Record<string, MoodCheckIn[]>, checkIn) => {
    if (!groups[checkIn.date]) {
      groups[checkIn.date] = [];
    }
    groups[checkIn.date].push(checkIn);
    return groups;
  }, {});

  return (
    <motion.div
      className="md:h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Reminder times come back once Bubble can actually send reminders */}
      <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Mood</h1>

      {/* Current mood selector */}
      <div className="surface rounded-3xl p-4 mb-6">
        <h2 className="text-white text-lg mb-3">How are you feeling right now?</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_ORDER.map((mood) => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              aria-pressed={selectedMood === mood}
              className={`rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${
                selectedMood === mood ? 'bg-white text-[#0b3d66]' : 'surface-soft surface-soft-hover text-white'
              }`}
            >
              {MOOD_LABELS[mood]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <motion.button
            onClick={saveMood}
            className="bg-[#0b6bb8] text-white rounded-full px-6 py-2 flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!selectedMood}
          >
            <Save className="w-5 h-5 mr-2" />
            Save mood
          </motion.button>
        </div>
      </div>

      {/* Mood history */}
      <div className="md:flex-1 surface rounded-3xl p-4 md:overflow-y-auto">
        <h2 className="text-white text-lg mb-4">Your mood history</h2>

        {!session && !sessionPending ? (
          <div className="text-white text-center py-8">
            <p className="mb-4 text-white/80">Sign in to keep a history of your check-ins and spot patterns over time.</p>
            <button onClick={() => openAccount()} className="bg-white text-[#0b5394] font-semibold rounded-full px-6 py-2">
              Sign in or create an account
            </button>
          </div>
        ) : moodsQuery.isError || saveCheckin.isError ? (
          <div className="text-white text-center py-8">
            <p className="mb-4">Couldn't reach your mood history.</p>
            <button onClick={() => moodsQuery.refetch()} className="bg-white/20 rounded-full px-6 py-2">
              Try again
            </button>
          </div>
        ) : moodsQuery.isPending ? (
          <MoodHistorySkeleton />
        ) : Object.keys(groupedHistory).length === 0 ? (
          <div className="text-white/90 text-center py-8">
            No check-ins yet. Save how you feel above and it will show up here.
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedHistory).map(([date, checkIns]) => (
              <section key={date}>
                <h3 className="mb-1 text-sm font-semibold text-white/85">{date}</h3>
                <ul className="divide-y divide-white/10">
                  {checkIns.map((checkIn) => (
                    <li key={checkIn.id} className="flex items-center justify-between gap-4 py-2">
                      <span className="whitespace-nowrap text-sm text-white/85">{checkIn.time}</span>
                      <span className="font-medium" style={{ color: MOOD_TONES[checkIn.mood] }}>
                        {MOOD_LABELS[checkIn.mood]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
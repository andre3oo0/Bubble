import { useState, useEffect, useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useSoundStore } from '@/store/soundStore';
import { useBreathing } from '@/store/breathingStore';
import { nextBreathingStep, PHASE_DURATIONS, type BreathingPhase } from '@/lib/breathing';
import { BUBBLE_COLOURS } from './BubbleAvatar';
import { buttonClass, darkSheetClass, iconButtonClass } from './ui/controls';

// Only stop the breathing tone, not scenery sounds someone started in Settings
function stopBreathingSound() {
  const sound = useSoundStore.getState();
  if (sound.playing === 'breathing') sound.stop();
}

const INSTRUCTIONS: Record<BreathingPhase, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out slowly',
  rest: 'Rest',
};

// The circle grows on the in-breath and shrinks on the out-breath
const circleVariants = {
  idle: { scale: 1, transition: { duration: 0.6 } },
  inhale: { scale: 1.45, transition: { duration: PHASE_DURATIONS.inhale, ease: 'easeInOut' } },
  hold: { scale: 1.45, transition: { duration: PHASE_DURATIONS.hold, ease: 'linear' } },
  exhale: { scale: 1, transition: { duration: PHASE_DURATIONS.exhale, ease: 'easeInOut' } },
  rest: { scale: 1, transition: { duration: PHASE_DURATIONS.rest, ease: 'linear' } },
};

export default function BreathingExercise() {
  const { isOpen, close } = useBreathing();
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [count, setCount] = useState(PHASE_DURATIONS.inhale);
  const [rounds, setRounds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The interval callback reads these, so it never sees a stale phase
  const phaseRef = useRef<BreathingPhase>('inhale');
  const countRef = useRef(PHASE_DURATIONS.inhale);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startExercise = () => {
    phaseRef.current = 'inhale';
    countRef.current = PHASE_DURATIONS.inhale;
    setPhase('inhale');
    setCount(PHASE_DURATIONS.inhale);
    setRounds(0);
    setIsActive(true);
    useSoundStore.getState().play('breathing');

    clearTimer();
    intervalRef.current = setInterval(() => {
      const step = nextBreathingStep(phaseRef.current, countRef.current);
      phaseRef.current = step.phase;
      countRef.current = step.count;
      setPhase(step.phase);
      setCount(step.count);
      if (step.completedRound) setRounds((n) => n + 1);
    }, 1000);
  };

  const stopExercise = () => {
    setIsActive(false);
    clearTimer();
    stopBreathingSound();
  };

  // Closing stops it and starts the next visit fresh
  useEffect(() => {
    if (!isOpen) {
      stopExercise();
      setRounds(0);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      clearTimer();
      stopBreathingSound();
    },
    [],
  );

  const status = isActive
    ? INSTRUCTIONS[phase]
    : rounds > 0
      ? `Well done. You breathed through ${rounds} ${rounds === 1 ? 'round' : 'rounds'}.`
      : "Press Start when you're ready";

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/70" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col items-center overflow-y-auto rounded-[8px] p-6 focus:outline-none ${darkSheetClass}`}
        >
          <DialogPrimitive.Close aria-label="Close breathing exercise" className={iconButtonClass('dark', 'absolute right-2 top-2')}>
            <X size={22} aria-hidden="true" />
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="text-2xl font-semibold">Breathe with Bubble</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-white/80">
            In for {PHASE_DURATIONS.inhale}, hold for {PHASE_DURATIONS.hold}, out for {PHASE_DURATIONS.exhale}.
          </DialogPrimitive.Description>

          {/* Fixed-size stage so the grown circle never spills over the text */}
          <div className="flex h-72 w-full items-center justify-center">
            {/* The slow growing and shrinking is the guide itself, so it keeps moving
                even with calm visuals on */}
            <MotionConfig reducedMotion="never">
              <motion.div
                className="flex h-36 w-36 items-center justify-center rounded-full border-4"
                style={{ backgroundColor: BUBBLE_COLOURS.fill, borderColor: BUBBLE_COLOURS.ring }}
                variants={circleVariants}
                animate={isActive ? phase : 'idle'}
              >
                {isActive && (
                  <span className="text-5xl font-bold" style={{ color: BUBBLE_COLOURS.ink }} aria-hidden="true">
                    {count}
                  </span>
                )}
              </motion.div>
            </MotionConfig>
          </div>

          <p className="mb-6 min-h-[3.5rem] text-center text-xl" role="status">
            {status}
          </p>

          {isActive ? (
            <button onClick={stopExercise} className={buttonClass({ variant: 'secondary', className: 'w-40' })}>
              Stop
            </button>
          ) : (
            <button onClick={startExercise} className={buttonClass({ className: 'w-40' })}>
              {rounds > 0 ? 'Start again' : 'Start'}
            </button>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

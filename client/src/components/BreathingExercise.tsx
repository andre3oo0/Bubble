import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { X } from 'lucide-react';
import { useSoundStore } from '@/store/soundStore';
import { nextBreathingStep, PHASE_DURATIONS, type BreathingPhase } from '@/lib/breathing';

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
}

// Only stop the breathing tone, not scenery sounds someone started in the Avatar tab
function stopBreathingSound() {
  const sound = useSoundStore.getState();
  if (sound.playing === 'breathing') sound.stop();
}

export default function BreathingExercise({ isOpen, onClose }: BreathingExerciseProps) {
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [count, setCount] = useState(PHASE_DURATIONS.inhale);
  const [rounds, setRounds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // The interval callback reads these, so it never sees a stale phase
  const phaseRef = useRef<BreathingPhase>('inhale');
  const countRef = useRef(PHASE_DURATIONS.inhale);

  // Animation properties for the breathing circle
  const circleVariants = {
    inhale: {
      scale: 1.5,
      transition: { duration: PHASE_DURATIONS.inhale, ease: "easeInOut" }
    },
    hold: {
      scale: 1.5,
      transition: { duration: PHASE_DURATIONS.hold, ease: "linear" }
    },
    exhale: {
      scale: 1,
      transition: { duration: PHASE_DURATIONS.exhale, ease: "easeInOut" }
    },
    rest: {
      scale: 1,
      transition: { duration: PHASE_DURATIONS.rest, ease: "linear" }
    }
  };

  // Text instructions for each phase
  const getInstructions = () => {
    switch (phase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out slowly...';
      case 'rest': return 'Rest...';
      default: return '';
    }
  };

  // Start the breathing exercise
  const startExercise = () => {
    phaseRef.current = 'inhale';
    countRef.current = PHASE_DURATIONS.inhale;
    setIsActive(true);
    setPhase('inhale');
    setCount(PHASE_DURATIONS.inhale);
    setRounds(0);
    setTotalTime(0);

    // Play breathing ambient sound
    useSoundStore.getState().play('breathing');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const step = nextBreathingStep(phaseRef.current, countRef.current);
      phaseRef.current = step.phase;
      countRef.current = step.count;

      setPhase(step.phase);
      setCount(step.count);
      if (step.completedRound) setRounds(prevRounds => prevRounds + 1);
      setTotalTime(prevTime => prevTime + 1);
    }, 1000);
  };

  // Stop the breathing exercise
  const stopExercise = () => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop the ambient sound
    stopBreathingSound();
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Make sure we stop any sounds when unmounting
      stopBreathingSound();
    };
  }, []);

  // Stop exercise when modal is closed
  useEffect(() => {
    if (!isOpen && isActive) {
      stopExercise();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="surface max-w-lg w-11/12 rounded-3xl p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button
              onClick={onClose}
              aria-label="Close breathing exercise"
              className="absolute top-4 right-4 text-white hover:text-gray-200"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-semibold text-white text-center mb-6">
              Breathe with Bubble
            </h2>

            <div className="flex flex-col items-center">
              {/* Fixed-size stage so the circle (scaled 1.5x on inhale, plus its glow)
                  never spills over the title or the instruction text */}
              <div className="flex h-[19rem] w-full items-center justify-center">
                {/* The slow growing/shrinking circle is the guide itself, so it keeps
                    moving even with calm visuals on */}
                <MotionConfig reducedMotion="never">
                  <motion.div
                    className="w-40 h-40 bg-[#D4F1FF]/70 rounded-full flex items-center justify-center breathe-circle"
                    variants={circleVariants}
                    animate={phase}
                  >
                    <div className="text-[#2980b9] text-5xl font-bold">{count}</div>
                  </motion.div>
                </MotionConfig>
              </div>

              <p className="text-white text-xl mb-4">{getInstructions()}</p>

              <dl className="mb-6 grid w-full grid-cols-2 divide-x divide-white/20 text-center text-white">
                <div>
                  <dt className="text-sm text-white/85">Time</dt>
                  <dd className="font-semibold">{formatTime(totalTime)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/85">Rounds</dt>
                  <dd className="font-semibold">{rounds}</dd>
                </div>
              </dl>

              {!isActive ? (
                <button
                  onClick={startExercise}
                  className="bg-[#0b6bb8] hover:bg-[#095a9c] text-white px-6 py-3 rounded-full font-medium"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={stopExercise}
                  className="surface-soft surface-soft-hover text-white px-6 py-3 rounded-full font-medium"
                >
                  Stop
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
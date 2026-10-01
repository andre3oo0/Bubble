import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import audioHandler from '@/lib/audioHandler';
import { nextBreathingStep, PHASE_DURATIONS, type BreathingPhase } from '@/lib/breathing';

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
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
      transition: { duration: 4, ease: "easeInOut" }
    },
    hold: {
      scale: 1.5,
      transition: { duration: 2, ease: "linear" }
    },
    exhale: {
      scale: 1,
      transition: { duration: 4, ease: "easeInOut" }
    },
    rest: {
      scale: 1,
      transition: { duration: 2, ease: "linear" }
    }
  };

  // Text instructions for each phase
  const getInstructions = () => {
    switch (phase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
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
    audioHandler.playBackgroundSound('feature_breathing');
    audioHandler.setBackgroundVolume(0.4); // Lower volume for background
    
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
    audioHandler.stopBackgroundSound();
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
      audioHandler.stopBackgroundSound();
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
            className="bg-[#A3DAFF]/70 max-w-lg w-11/12 rounded-2xl p-6 relative glassmorphism"
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
              Breathing Exercise
            </h2>
            
            <div className="flex flex-col items-center">
              {/* Fixed-size stage so the circle (scaled 1.5x on inhale, plus its glow)
                  never spills over the title or the instruction text */}
              <div className="flex h-[19rem] w-full items-center justify-center">
                <motion.div
                  className="w-40 h-40 bg-[#D4F1FF]/70 rounded-full flex items-center justify-center breathe-circle"
                  variants={circleVariants}
                  animate={phase}
                >
                  <div className="text-[#2980b9] text-5xl font-bold">{count}</div>
                </motion.div>
              </div>
              
              <p className="text-white text-xl mb-4">{getInstructions()}</p>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-6">
                <div className="bg-[#B8DFFC]/60 p-3 rounded-xl text-center">
                  <p className="text-white text-sm">Total Time</p>
                  <p className="text-white font-semibold">{formatTime(totalTime)}</p>
                </div>
                <div className="bg-[#B8DFFC]/60 p-3 rounded-xl text-center">
                  <p className="text-white text-sm">Rounds</p>
                  <p className="text-white font-semibold">{rounds}</p>
                </div>
              </div>
              
              {!isActive ? (
                <button
                  onClick={startExercise}
                  className="bg-[#50c8ff] hover:bg-[#38b6ff] text-white px-6 py-3 rounded-full font-medium"
                >
                  Start Breathing
                </button>
              ) : (
                <button
                  onClick={stopExercise}
                  className="bg-[#ff5050] hover:bg-[#ff3838] text-white px-6 py-3 rounded-full font-medium"
                >
                  Stop Exercise
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
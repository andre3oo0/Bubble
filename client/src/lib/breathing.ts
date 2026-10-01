export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

// Seconds per phase
export const PHASE_DURATIONS: Record<BreathingPhase, number> = {
  inhale: 4,
  hold: 2,
  exhale: 4,
  rest: 2,
};

const NEXT_PHASE: Record<BreathingPhase, BreathingPhase> = {
  inhale: 'hold',
  hold: 'exhale',
  exhale: 'rest',
  rest: 'inhale',
};

export interface BreathingStep {
  phase: BreathingPhase;
  count: number;
  completedRound: boolean;
}

// One tick of the countdown (called every second)
export function nextBreathingStep(phase: BreathingPhase, count: number): BreathingStep {
  if (count > 1) {
    return { phase, count: count - 1, completedRound: false };
  }
  const next = NEXT_PHASE[phase];
  return { phase: next, count: PHASE_DURATIONS[next], completedRound: phase === 'rest' };
}

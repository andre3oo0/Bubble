import { describe, expect, it } from 'vitest';
import { nextBreathingStep, PHASE_DURATIONS, type BreathingPhase } from './breathing';

describe('nextBreathingStep', () => {
  it('runs a full round with the right length for each phase', () => {
    let phase: BreathingPhase = 'inhale';
    let count = PHASE_DURATIONS.inhale;
    const secondsInPhase: Record<BreathingPhase, number> = { inhale: 0, hold: 0, exhale: 0, rest: 0 };
    let rounds = 0;

    // 12 seconds = one full 4-2-4-2 round
    for (let tick = 0; tick < 12; tick++) {
      secondsInPhase[phase] += 1;
      const step = nextBreathingStep(phase, count);
      phase = step.phase;
      count = step.count;
      if (step.completedRound) rounds += 1;
    }

    expect(secondsInPhase).toEqual(PHASE_DURATIONS);
    expect(rounds).toBe(1);
    expect(phase).toBe('inhale');
    expect(count).toBe(PHASE_DURATIONS.inhale);
  });

  it('counts down within a phase', () => {
    expect(nextBreathingStep('exhale', 3)).toEqual({ phase: 'exhale', count: 2, completedRound: false });
  });

  it('moves from hold to exhale with a fresh count', () => {
    expect(nextBreathingStep('hold', 1)).toEqual({ phase: 'exhale', count: 4, completedRound: false });
  });
});

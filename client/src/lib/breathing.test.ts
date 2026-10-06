import { describe, expect, it } from 'vitest';
import { nextBreathingStep, PHASE_DURATIONS, type BreathingPhase } from './breathing';

describe('nextBreathingStep', () => {
  it('runs a full round with the right length for each phase', () => {
    let phase: BreathingPhase = 'inhale';
    let count = PHASE_DURATIONS.inhale;
    const secondsInPhase: Record<BreathingPhase, number> = { inhale: 0, hold: 0, exhale: 0, rest: 0 };
    let rounds = 0;

    // One full round is every phase's seconds added up
    const roundSeconds = Object.values(PHASE_DURATIONS).reduce((sum, seconds) => sum + seconds, 0);
    for (let tick = 0; tick < roundSeconds; tick++) {
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

  it('breathes out for longer than in, at a slow pace', () => {
    expect(PHASE_DURATIONS.exhale).toBeGreaterThan(PHASE_DURATIONS.inhale);
    const roundSeconds = Object.values(PHASE_DURATIONS).reduce((sum, seconds) => sum + seconds, 0);
    expect(60 / roundSeconds).toBeLessThanOrEqual(4);
  });

  it('counts down within a phase', () => {
    expect(nextBreathingStep('exhale', 3)).toEqual({ phase: 'exhale', count: 2, completedRound: false });
  });

  it('moves from hold to exhale with a fresh count', () => {
    expect(nextBreathingStep('hold', 1)).toEqual({ phase: 'exhale', count: PHASE_DURATIONS.exhale, completedRound: false });
  });
});

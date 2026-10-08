import { describe, expect, it } from 'vitest';
import { GROUNDING_STEPS, KIND_WORDS, MIRROR_STEPS, THOUGHT_LINES } from './calmKit';

describe('calm kit', () => {
  it("keeps the design document's lines word for word", () => {
    const lines = THOUGHT_LINES.map((line) => line.text);
    expect(lines).toContain("Your thoughts don't define you. Let them pass through and remember, you're doing your best.");
    expect(lines).toContain("You're in a safe space here, take a deep breath, we'll get through this together.");
  });

  it('counts down from five senses to one', () => {
    expect(GROUNDING_STEPS.map((step) => step.prompt.match(/\b(five|four|three|two|one)\b/)?.[1])).toEqual(['five', 'four', 'three', 'two', 'one']);
  });

  // The same stock phrases Bubble's chat prompt avoids
  it('stays clear of stock therapy phrases', () => {
    const all = [...THOUGHT_LINES.flatMap((line) => [line.text, line.tryThis ?? '']), ...KIND_WORDS, ...MIRROR_STEPS];
    for (const text of all) expect(text).not.toMatch(/\bvalid\b|sit with|holding space/i);
  });
});

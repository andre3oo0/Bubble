import { describe, expect, it } from 'vitest';
import { MOOD_TONES } from './moods';

// Guards the colours white text sits on, so they keep meeting WCAG AA (4.5:1)

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('white text contrast', () => {
  it.each([
    ['#0b6bb8', 'buttons, user chat bubble, selected options'],
    ['#095a9c', 'button hover'],
    ['#0b5394', 'SOS call buttons'],
    // Scene skies behind headings and the home text (SceneBackdrop.tsx), lightest
    // stop above the horizon. Night only darkens them.
    ['#2a74b0', 'ocean sky'],
    ['#3d7a62', 'forest sky'],
    ['#a4594b', 'sunset sky'],
    ['#4a3026', 'cozy room wall'],
  ])('%s (%s) passes AA', (background) => {
    expect(contrast('#ffffff', background)).toBeGreaterThanOrEqual(4.5);
  });
});

// Mood words in the history are drawn in their tone on the dark frosted panel.
// #1d2b40 is roughly that panel over the lightest scene.
describe('mood tone contrast', () => {
  it.each(Object.entries(MOOD_TONES))('%s (%s) passes AA on the panel', (_mood, tone) => {
    expect(contrast(tone, '#1d2b40')).toBeGreaterThanOrEqual(4.5);
  });
});

// Bubble's chat messages, the helplines inside them and the breathing count all sit on
// Bubble's own light fill
describe("text on Bubble's fill", () => {
  it.each([
    ['#0b3d66', "Bubble's messages and the breathing count"],
    ['#0b5394', 'helpline numbers in a message'],
    ['#374151', 'helpline hours in a message (gray-700)'],
  ])('%s (%s) passes AA on #C9ECFF', (text) => {
    expect(contrast(text, '#C9ECFF')).toBeGreaterThanOrEqual(4.5);
  });
});

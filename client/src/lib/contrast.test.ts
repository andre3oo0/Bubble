import { describe, expect, it } from 'vitest';

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
    ['#a84a62', 'sunset sky'],
    ['#4a3026', 'cozy room wall'],
  ])('%s (%s) passes AA', (background) => {
    expect(contrast('#ffffff', background)).toBeGreaterThanOrEqual(4.5);
  });
});

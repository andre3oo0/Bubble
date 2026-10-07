import { describe, expect, it } from 'vitest';
import { LEGAL_CONTACT } from '@shared/legal';
import { feedbackEmailLink } from './feedback';

describe('feedback email', () => {
  it('fills in the message and rating for the contact address', () => {
    const link = feedbackEmailLink('Love the scenes & sounds', 4);
    expect(link.startsWith(`mailto:${LEGAL_CONTACT}?`)).toBe(true);
    const params = new URLSearchParams(link.split('?')[1]);
    expect(params.get('subject')).toBe('Bubble feedback');
    expect(params.get('body')).toBe('Love the scenes & sounds\n\nRating: 4 out of 5');
  });

  it('writes spaces so email apps show them as spaces', () => {
    expect(feedbackEmailLink('a b', null)).not.toContain('+');
  });

  it('works with only a rating', () => {
    const params = new URLSearchParams(feedbackEmailLink('  ', 2).split('?')[1]);
    expect(params.get('body')).toBe('Rating: 2 out of 5');
  });
});

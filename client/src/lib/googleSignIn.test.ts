import { describe, expect, it, vi } from 'vitest';

vi.mock('./authClient', () => ({ signIn: { social: vi.fn() } }));
const { googleSignInProblem } = await import('./googleSignIn');

describe('googleSignInProblem', () => {
  it('says nothing on an ordinary visit', () => {
    expect(googleSignInProblem('')).toBeNull();
    expect(googleSignInProblem('?error=account_not_linked')).toBeNull();
  });

  it('says nothing when the person cancelled at Google', () => {
    expect(googleSignInProblem('?signin=google&error=access_denied')).toBeNull();
  });

  it('explains an existing email account that is not linked yet', () => {
    expect(googleSignInProblem('?signin=google&error=account_not_linked')).toMatch(/already a Bubble account/);
  });

  it('falls back to a general message for anything else', () => {
    expect(googleSignInProblem('?signin=google&error=state_mismatch')).toMatch(/Couldn't sign in with Google/);
    expect(googleSignInProblem('?signin=google')).toMatch(/Couldn't sign in with Google/);
  });
});

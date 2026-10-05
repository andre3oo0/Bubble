import { signIn } from './authClient';

// Google sends people back here with ?signin=google, plus &error=... if it didn't work
const RETURN_PARAM = 'signin';

export function continueWithGoogle() {
  return signIn.social({
    provider: 'google',
    callbackURL: '/',
    errorCallbackURL: `/?${RETURN_PARAM}=google`,
  });
}

// What to tell someone who came back from Google without being signed in.
// null when there's nothing to say (not a Google return, or they chose to cancel).
export function googleSignInProblem(search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.get(RETURN_PARAM) !== 'google') return null;
  switch (params.get('error')) {
    case 'access_denied':
      return null;
    case 'account_not_linked':
      return "There's already a Bubble account with that email. Sign in with your password for now. Once you've confirmed your email, Continue with Google will work too.";
    default:
      return "Couldn't sign in with Google. Please try again, or use your email instead.";
  }
}

// Takes the sign-in leftovers out of the address bar
export function clearGoogleReturn() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RETURN_PARAM)) return;
  url.searchParams.delete(RETURN_PARAM);
  url.searchParams.delete('error');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

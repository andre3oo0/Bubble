import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { agreeToTerms } from '@/lib/api';
import { useSession } from '@/lib/authClient';
import { signOutHere } from '@/lib/signOut';
import { LEGAL_VERSION, MIN_AGE } from '@shared/legal';

const linkClass = 'font-medium text-[#0b5394] underline underline-offset-2';

// Signed-in people who haven't agreed to the current terms and privacy policy: Google
// sign-ups (Google's button has no tick box), accounts from before the policy, and
// everyone after a change. It can't be dismissed, only agreed to or signed out of;
// chat and the help screen still work signed out.
export default function ConsentGate() {
  const { data: session, refetch } = useSession();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const needsConsent = !!session && session.user.termsVersion !== LEGAL_VERSION;
  const isNew = !session?.user.termsVersion;

  const agree = async () => {
    setBusy(true);
    setError('');
    try {
      await agreeToTerms(LEGAL_VERSION);
      await refetch();
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    }
    setBusy(false);
  };

  const signOutInstead = async () => {
    setBusy(true);
    await signOutHere(queryClient);
    setBusy(false);
  };

  return (
    <DialogPrimitive.Root open={needsConsent}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#06101f]/60" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[60] max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[8px] bg-white p-6 text-gray-900 shadow-2xl focus:outline-none"
        >
          <DialogPrimitive.Title className="text-2xl font-bold text-[#0b3d66]">
            {isNew ? 'Before you carry on' : "We've updated our terms"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-gray-700">
            {isNew
              ? "Bubble's terms of use and privacy policy explain what Bubble keeps (as little as it can), and that chat messages go to its AI provider in the US to get a reply."
              : "Please have a look at what's changed in the terms of use and privacy policy, and agree to carry on using your account."}
          </DialogPrimitive.Description>

          <p className="mt-3 text-sm text-gray-700">
            Read the{' '}
            <a href="/terms" target="_blank" rel="noopener" className={linkClass}>
              terms of use
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener" className={linkClass}>
              privacy policy
            </a>
            . If you're in danger, call 112.
          </p>

          <label className="mt-4 flex items-start gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={busy}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b5394]"
            />
            <span>
              I'm {MIN_AGE} or older and I agree to the terms of use and privacy policy, including my messages being sent to
              Bubble's AI provider in the US.
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            onClick={agree}
            disabled={!agreed || busy}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-[8px] bg-[#0b5394] font-semibold text-white hover:bg-[#0b3d66] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/40 disabled:opacity-60"
          >
            Agree and continue
          </button>
          <button
            onClick={signOutInstead}
            disabled={busy}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-[8px] font-medium text-gray-800 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 disabled:opacity-60"
          >
            Not now, sign me out
          </button>
          <p className="mt-2 text-center text-xs text-gray-600">You can still chat without an account.</p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

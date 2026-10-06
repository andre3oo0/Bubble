import { useState } from 'react';
import { Link } from 'wouter';
import { KeyRound } from 'lucide-react';
import { resetPassword } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { MIN_PASSWORD_LENGTH } from '@shared/account';

const inputClass =
  'w-full rounded-xl bg-[#D4F1FF] p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#0b6bb8]/40';

// Opened from the reset email. Better Auth redirects here with ?token=... or
// ?error=INVALID_TOKEN when the link is expired or already used.
export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const linkBroken = !token || params.has('error');
  const { open: openAccount } = useAccountDialog();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (password !== confirm) {
      setErrorMessage("The two passwords don't match.");
      return;
    }
    setIsLoading(true);
    const { error } = await resetPassword({ newPassword: password, token: token! });
    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message || "Couldn't reset your password. The link may have expired.");
      return;
    }
    setDone(true);
    // Drop the token from the address bar and history
    window.history.replaceState(null, '', '/reset-password');
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a6fc4] to-[#0b5394] dark:from-[#0b1d3a] dark:to-[#050d1a] p-4"
      style={{ minHeight: '100dvh' }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-[#0b5394]" aria-hidden="true" />
          <h1 className="text-2xl font-bold">
            {done ? 'Password changed' : linkBroken ? 'This link has expired' : 'Choose a new password'}
          </h1>
        </div>

        {done ? (
          <>
            <p className="mb-4 text-gray-700">
              Your password has been changed and you've been signed out everywhere else. Sign in with your new password.
            </p>
            <Link href="/" onClick={() => openAccount()} className="block w-full rounded-xl bg-[#0b5394] py-3 text-center font-medium text-white">
              Go to sign in
            </Link>
          </>
        ) : linkBroken ? (
          <>
            <p className="mb-4 text-gray-700">
              Reset links work for one hour and only once. Ask for a new one from the sign-in screen.
            </p>
            <Link href="/" onClick={() => openAccount()} className="block w-full rounded-xl bg-[#0b5394] py-3 text-center font-medium text-white">
              Back to Bubble
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-800">
                New password
              </label>
              <input
                type="password"
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-600">At least {MIN_PASSWORD_LENGTH} characters. A few words together is easy to remember.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-800">
                Type it again
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={isLoading}
              />
            </div>
            {errorMessage && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#0b5394] py-3 font-medium text-white hover:bg-[#09457c] disabled:opacity-70"
            >
              Save new password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

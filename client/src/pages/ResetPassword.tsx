import { useState } from 'react';
import { Link } from 'wouter';
import { resetPassword } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { MIN_PASSWORD_LENGTH } from '@shared/account';
import { buttonClass, fieldClass, labelClass, noticeClass } from '@/components/ui/controls';

const inputClass = fieldClass.light;
const primaryClass = buttonClass({ tone: 'light', className: 'min-h-12 w-full' });

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
      className="flex min-h-screen items-center justify-center bg-[#0b2a4a] p-4"
      style={{ minHeight: '100dvh' }}
    >
      <div className="w-full max-w-md rounded-[8px] bg-white p-6 text-gray-900 sm:p-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#0b3d66]">
            {done ? 'Password changed' : linkBroken ? 'This link has expired' : 'Choose a new password'}
          </h1>
        </div>

        {done ? (
          <>
            <p className="mb-4 text-gray-700">
              Your password has been changed and you've been signed out everywhere else. Sign in with your new password.
            </p>
            <Link href="/" onClick={() => openAccount()} className={primaryClass}>
              Go to sign in
            </Link>
          </>
        ) : linkBroken ? (
          <>
            <p className="mb-4 text-gray-700">
              Reset links work for one hour and only once. Ask for a new one from the sign-in screen.
            </p>
            <Link href="/" onClick={() => openAccount()} className={primaryClass}>
              Back to Bubble
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className={labelClass.light}>
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
              <label htmlFor="confirm-password" className={labelClass.light}>
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
              <p role="alert" className={noticeClass.error}>
                {errorMessage}
              </p>
            )}
            <button type="submit" disabled={isLoading} className={primaryClass}>
              {isLoading ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

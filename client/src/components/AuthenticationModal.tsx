import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, LogIn, LogOut, MailCheck, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  deleteUser,
  requestPasswordReset,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  useSession,
} from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useToast } from '@/hooks/use-toast';

const inputClass =
  'w-full rounded-xl bg-[#D4F1FF] p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#0b6bb8]/40';
const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5394] py-3 font-medium text-white hover:bg-[#09457c] focus:outline-none focus:ring-4 focus:ring-[#0b5394]/40 disabled:opacity-70';
const secondaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-70';

// Device-only data removed when the account is deleted (display preferences are kept)
const PERSONAL_STORAGE_KEYS = ['bubble-mood', 'activePanel', 'checkInTimes', 'journalEntries', 'moodHistory'];

type Mode = 'login' | 'register' | 'forgot';

export default function AuthenticationModal() {
  const { isOpen, close } = useAccountDialog();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const resetForm = () => {
    setPassword('');
    setErrorMessage('');
    setNotice('');
    setIsLoading(false);
    setConfirmingDelete(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMessage('');
    setNotice('');
  };

  const handleClose = () => {
    resetForm();
    setMode('login');
    close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsLoading(true);

    if (mode === 'forgot') {
      const { error } = await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message || "Couldn't send the email. Please try again.");
      } else {
        // Same message whether or not the account exists, so this can't be used to check emails
        setNotice("If there's an account for that email, we've sent a reset link. Check your inbox and spam folder.");
      }
      return;
    }

    const { error } =
      mode === 'login'
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password, callbackURL: '/' });

    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      return;
    }
    // Load this account's journal and moods fresh
    queryClient.invalidateQueries();
    handleClose();
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    // Don't leave the previous person's entries in memory on a shared device
    queryClient.clear();
    handleClose();
  };

  const handleResendVerification = async () => {
    if (!session) return;
    setIsLoading(true);
    const { error } = await sendVerificationEmail({ email: session.user.email, callbackURL: '/' });
    setIsLoading(false);
    setNotice(error ? "Couldn't send the email. Please try again later." : 'Sent. Check your inbox and spam folder.');
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    const { error } = await deleteUser({ password });
    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message || "Couldn't delete your account. Check your password and try again.");
      return;
    }
    queryClient.clear();
    PERSONAL_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // storage can be unavailable (private mode); nothing to remove then
      }
    });
    handleClose();
    toast({ title: 'Your account has been deleted', description: 'Your journal, mood history and account are gone for good.' });
  };

  const renderSignedIn = () => {
    if (!session) return null;

    if (confirmingDelete) {
      return (
        <>
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold">Delete your account?</DialogTitle>
            <DialogDescription className="text-base text-gray-700">
              This permanently deletes your account, journal and mood history. It can't be undone. You may want to
              download your data first.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <label htmlFor="delete-password" className="mb-1 block text-sm font-medium text-gray-800">
                Enter your password to confirm
              </label>
              <input
                type="password"
                id="delete-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-70"
            >
              <Trash2 size={18} aria-hidden="true" />
              Delete my account permanently
            </button>
            <button type="button" onClick={resetForm} className={secondaryButtonClass} disabled={isLoading}>
              Keep my account
            </button>
          </form>
        </>
      );
    }

    return (
      <>
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">Your account</DialogTitle>
          <DialogDescription className="text-base text-gray-700">
            Signed in as <span className="font-semibold">{session.user.name}</span> ({session.user.email})
          </DialogDescription>
        </DialogHeader>

        {!session.user.emailVerified && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>Please confirm your email so you can reset your password if you ever forget it.</p>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="mt-1 flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
            >
              <MailCheck size={16} aria-hidden="true" />
              Send the confirmation email again
            </button>
          </div>
        )}
        {notice && <p className="text-sm text-gray-700">{notice}</p>}

        <div className="space-y-3">
          {/* Plain link: same-origin, so the session cookie goes along and the browser saves the file */}
          <a href="/api/me/export" download className={secondaryButtonClass}>
            <Download size={18} aria-hidden="true" />
            Download my data
          </a>
          <button onClick={handleSignOut} disabled={isLoading} className={secondaryButtonClass}>
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
          <button
            onClick={() => {
              setConfirmingDelete(true);
              setPassword('');
              setErrorMessage('');
            }}
            className="w-full py-2 text-sm font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Delete my account
          </button>
        </div>
      </>
    );
  };

  const titles: Record<Mode, string> = {
    login: 'Sign in to Bubble',
    register: 'Create an account',
    forgot: 'Reset your password',
  };

  const renderSignedOut = () => (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="text-2xl font-bold">{titles[mode]}</DialogTitle>
        <DialogDescription className="text-base text-gray-700">
          {mode === 'forgot'
            ? "Enter your email and we'll send you a link to choose a new password."
            : 'Your journal and mood history are saved to your account and only you can see them.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-gray-800">
              What should Bubble call you?
            </label>
            <input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="nickname"
              required
              disabled={isLoading}
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-gray-800">
            Email
          </label>
          <input
            type="email"
            id="auth-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={isLoading}
          />
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-800">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-[#0b5394] underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              disabled={isLoading}
            />
            {mode === 'register' && <p className="mt-1 text-xs text-gray-600">At least 8 characters</p>}
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
            {notice}
          </p>
        )}

        <button type="submit" className={primaryButtonClass} disabled={isLoading}>
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              {mode === 'register' ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
              <span>{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}</span>
            </>
          )}
        </button>
      </form>

      <button
        onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'forgot' ? 'login' : 'register')}
        className="text-sm text-[#0b5394] hover:underline"
        disabled={isLoading}
      >
        {mode === 'login' ? "Don't have an account? Create one" : 'Back to sign in'}
      </button>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-6 text-gray-900 sm:rounded-3xl">
        {session ? renderSignedIn() : renderSignedOut()}
      </DialogContent>
    </Dialog>
  );
}

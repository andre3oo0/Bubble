import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, LogIn, LogOut, MailCheck, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  authClient,
  changePassword,
  deleteUser,
  requestPasswordReset,
  sendVerificationEmail,
  signIn,
  signUp,
  useSession,
} from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useToast } from '@/hooks/use-toast';
import { forgetDevice } from '@/lib/forgetDevice';
import { signOutHere } from '@/lib/signOut';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '@shared/account';
import { LEGAL_VERSION, MIN_AGE } from '@shared/legal';
import GoogleButton, { useGoogleSignIn } from './GoogleButton';

const inputClass =
  'w-full rounded-xl bg-[#D4F1FF] p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#0b6bb8]/40';
const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5394] py-3 font-medium text-white hover:bg-[#09457c] focus:outline-none focus:ring-4 focus:ring-[#0b5394]/40 disabled:opacity-70';
const secondaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-70';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthenticationModal() {
  const { isOpen, close, startMode, allowGoogle, message, action } = useAccountDialog();
  const googleEnabled = useGoogleSignIn();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  // Someone who only ever used Google has no password to change or confirm with
  const [needsFreshSignIn, setNeedsFreshSignIn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(startMode);
    // Opened from Settings' "Change password" or "Delete my account"
    setChangingPassword(action === 'change-password');
    setConfirmingDelete(action === 'delete');
  }, [isOpen, startMode, action]);

  const accounts = useQuery({
    queryKey: ['auth-accounts', session?.user.id],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!session,
  });
  // Assume a password until we know otherwise, which is how it worked before Google
  const hasPassword = accounts.data ? accounts.data.some((account) => account.providerId === 'credential') : true;

  const resetForm = () => {
    setPassword('');
    setNewPassword('');
    setErrorMessage('');
    setNotice('');
    setIsLoading(false);
    setConfirmingDelete(false);
    setChangingPassword(false);
    setNeedsFreshSignIn(false);
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

    if (mode === 'register') {
      // Sign-up answers the same whether or not the email already has an account (so it
      // can't be used to check who uses Bubble), then we sign in with the new password
      // The server checks this is the current version and records when they agreed
      const { error } = await signUp.email({
        name,
        email,
        password,
        callbackURL: '/',
        acceptedTerms: agreed ? LEGAL_VERSION : undefined,
      } as Parameters<typeof signUp.email>[0]);
      if (error) {
        setIsLoading(false);
        setErrorMessage(error.message || 'Something went wrong. Please try again.');
        return;
      }
    }
    const { error } = await signIn.email({ email, password });

    setIsLoading(false);
    if (error) {
      setErrorMessage(
        mode === 'register' && error.status === 401
          ? "We couldn't create an account with those details. If you already have one, sign in instead, or reset your password."
          : error.message || 'Something went wrong. Please try again.',
      );
      return;
    }
    // Load this account's journal and moods fresh
    queryClient.invalidateQueries();
    handleClose();
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOutHere(queryClient);
    handleClose();
  };

  const handleResendVerification = async () => {
    if (!session) return;
    setIsLoading(true);
    const { error } = await sendVerificationEmail({ email: session.user.email, callbackURL: '/' });
    setIsLoading(false);
    setNotice(error ? "Couldn't send the email. Please try again later." : 'Sent. Check your inbox and spam folder.');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsLoading(true);
    // Signs out every other device, same as a reset
    const { error } = await changePassword({ currentPassword: password, newPassword, revokeOtherSessions: true });
    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message || "Couldn't change your password. Check your current one and try again.");
      return;
    }
    resetForm();
    toast({ title: 'Password changed', description: "You're still signed in here and signed out everywhere else." });
  };

  const handleEmailResetLink = async () => {
    if (!session) return;
    setErrorMessage('');
    setIsLoading(true);
    const { error } = await requestPasswordReset({
      email: session.user.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    setNotice(error ? "Couldn't send the email. Please try again later." : `We've sent a reset link to ${session.user.email}.`);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    // Without a password, Better Auth accepts a sign-in from the last 24 hours instead
    const { error } = await deleteUser(hasPassword ? { password } : {});
    setIsLoading(false);
    if (error) {
      if (!hasPassword && error.code === 'SESSION_EXPIRED') {
        setNeedsFreshSignIn(true);
        return;
      }
      setErrorMessage(error.message || "Couldn't delete your account. Check your password and try again.");
      return;
    }
    queryClient.clear();
    await forgetDevice();
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
          {needsFreshSignIn && (
            <div className="space-y-3 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <p>To keep your account safe, please sign in with Google again first. Then come back here to delete it.</p>
              <GoogleButton />
            </div>
          )}
          <form onSubmit={handleDelete} className="space-y-4">
            {hasPassword && (
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
            )}
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

    if (changingPassword) {
      return (
        <>
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold">Change your password</DialogTitle>
            <DialogDescription className="text-base text-gray-700">
              Other devices signed in to this account will be signed out.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-gray-800">
                Current password
              </label>
              <input
                type="password"
                id="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-800">
                New password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-600">At least {MIN_PASSWORD_LENGTH} characters. A few words together is easy to remember.</p>
            </div>
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
              <KeyRound size={18} aria-hidden="true" />
              Change password
            </button>
            <button
              type="button"
              onClick={handleEmailResetLink}
              disabled={isLoading}
              className="w-full text-sm font-medium text-[#0b5394] underline underline-offset-2"
            >
              Forgot your current password? Email me a reset link
            </button>
            <button type="button" onClick={resetForm} className={secondaryButtonClass} disabled={isLoading}>
              Back
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
          {hasPassword && (
            <button
              onClick={() => {
                setChangingPassword(true);
                setPassword('');
                setErrorMessage('');
                setNotice('');
              }}
              className={secondaryButtonClass}
            >
              <KeyRound size={18} aria-hidden="true" />
              Change password
            </button>
          )}
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

      {message && mode !== 'forgot' && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      )}

      {googleEnabled && mode !== 'forgot' && (
        allowGoogle ? (
          <>
            <GoogleButton />
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="h-px flex-1 bg-gray-200" />
              or use your email
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Google sign-in isn't available here, because leaving the page would clear this reflection.
          </p>
        )
      )}

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
              maxLength={MAX_NAME_LENGTH}
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
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-gray-800">
              Password
            </label>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              // Older accounts may have shorter passwords, so only new ones are checked
              minLength={mode === 'register' ? MIN_PASSWORD_LENGTH : undefined}
              required
              disabled={isLoading}
            />
            {mode === 'register' && (
              <p className="mt-1 text-xs text-gray-600">At least {MIN_PASSWORD_LENGTH} characters. A few words together is easy to remember.</p>
            )}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="mt-2 text-sm font-medium text-[#0b5394] underline underline-offset-2"
              >
                Forgot your password?
              </button>
            )}
          </div>
        )}

        {mode === 'register' && (
          <label className="flex items-start gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              disabled={isLoading}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b5394]"
            />
            <span>
              I'm {MIN_AGE} or older and I agree to the{' '}
              {/* New tab, so the form isn't lost */}
              <a href="/terms" target="_blank" rel="noopener" className="font-medium text-[#0b5394] underline underline-offset-2">
                terms of use
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener" className="font-medium text-[#0b5394] underline underline-offset-2">
                privacy policy
              </a>
              , including my messages being sent to Bubble's AI provider in the US.
            </span>
          </label>
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
        {mode === 'login'
          ? "Don't have an account? Create one"
          : mode === 'register'
            ? 'Already have an account? Sign in'
            : 'Back to sign in'}
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

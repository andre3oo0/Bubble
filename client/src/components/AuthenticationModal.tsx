import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { signIn, signOut, signUp, useSession } from '@/lib/authClient';

import { useAccountDialog } from '@/store/accountStore';

const inputClass =
  'w-full rounded-xl bg-[#D4F1FF] p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#50c8ff]/40';

export default function AuthenticationModal() {
  const { isOpen, close } = useAccountDialog();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setPassword('');
    setErrorMessage('');
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const { error } =
      mode === 'login'
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password });

    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      return;
    }
    // Load this account's journal and moods fresh
    queryClient.invalidateQueries();
    resetForm();
    close();
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    // Don't leave the previous person's entries in memory on a shared device
    queryClient.clear();
    resetForm();
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-white p-6 text-gray-900 sm:rounded-3xl">
        {session ? (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-bold">Your account</DialogTitle>
              <DialogDescription className="text-base text-gray-700">
                Signed in as <span className="font-semibold">{session.user.name}</span> ({session.user.email})
              </DialogDescription>
            </DialogHeader>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </>
        ) : (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-bold">
                {mode === 'login' ? 'Sign in to Bubble' : 'Create an account'}
              </DialogTitle>
              <DialogDescription className="text-base text-gray-700">
                Your journal and mood history are saved to your account and only you can see them.
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
                  minLength={8}
                  required
                  disabled={isLoading}
                />
                {mode === 'register' && <p className="mt-1 text-xs text-gray-600">At least 8 characters</p>}
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5394] py-3 font-medium text-white hover:bg-[#09457c] focus:outline-none focus:ring-4 focus:ring-[#0b5394]/40 disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
                    <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMessage('');
              }}
              className="text-sm text-[#0b5394] hover:underline"
              disabled={isLoading}
            >
              {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

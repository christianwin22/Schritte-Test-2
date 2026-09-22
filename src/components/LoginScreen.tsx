import React, { useEffect, useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  /** An error to show on arrival, e.g. a refused Google sign-in coming back from the redirect. */
  initialError?: string | null;
}

/** Turns Supabase's error text into something a learner can act on. */
export function friendlyAuthError(message: string): string {
  if (/database error saving new user|not allowed/i.test(message)) {
    return "This email isn't on the list for this app. Ask Chris to add it.";
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Couldn't reach the sign-in service. Check your internet connection and try again.";
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many sign-in emails in a short time. Wait a minute and try again.';
  }
  return message;
}

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialError = null }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // The app sets light/dark itself once it loads; before that, follow the device.
  useEffect(() => {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', !!prefersDark);
  }, []);

  const redirectTo = window.location.origin;

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError(null);
    setBusy('google');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    // On success the browser is already leaving for Google; only failures return here.
    if (error) {
      setError(friendlyAuthError(error.message));
      setBusy(null);
    }
  };

  const sendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setError(null);
    setBusy('email');
    const address = email.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(null);
    if (error) setError(friendlyAuthError(error.message));
    else setSentTo(address);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center px-4 font-sans overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-zinc-300 flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 text-[#222834]" aria-hidden="true">
              <rect x="5" y="19" width="6" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
              <rect x="13" y="12" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="21" y="6" width="6" height="20" rx="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tight">Chris Personal App</h1>
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Schritte International Neu</p>
        </div>

        {!supabase ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-sm space-y-1.5">
            <p className="font-black text-amber-900 dark:text-amber-200">Login isn't connected yet</p>
            <p className="text-amber-800/90 dark:text-amber-300/90 text-xs font-medium">
              The Supabase keys are missing. Add <code className="font-bold">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> to <code className="font-bold">.env.local</code>{' '}
              (or to Vercel's environment variables), then reload. Steps are in SETUP-LOGIN.md.
            </p>
          </div>
        ) : sentTo ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 text-sm space-y-2 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="font-black text-emerald-900 dark:text-emerald-100">Check your inbox</p>
            <p className="text-xs font-medium text-emerald-800/90 dark:text-emerald-300/90">
              We sent a sign-in link to <span className="font-bold">{sentTo}</span>. Open it on this device.
            </p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="text-xs font-black text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy !== null}
              className="w-full py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-zinc-300 font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {busy === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleMark />}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-zinc-400">
              <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              or
              <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <form onSubmit={sendEmailLink} className="space-y-2.5">
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-zinc-300 outline-none font-bold text-sm"
              />
              <button
                type="submit"
                disabled={busy !== null || !email.trim()}
                className="w-full py-3.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {busy === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Email me a sign-in link</span>
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[11px] text-center font-medium text-zinc-400">
          Private app — only invited accounts can sign in.
        </p>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppLogo } from './AppLogo';

/** Minimum length checked here, before Supabase applies its own rule. */
export const MIN_PASSWORD_LENGTH = 8;

/** Where the password-reset email sends people back to; AuthGate looks for this flag. */
export const RESET_FLAG = 'reset';

/** Turns Supabase's error text into something a learner can act on. */
export function friendlyAuthError(message: string): string {
  if (/database error saving new user|not allowed/i.test(message)) {
    return "This email isn't on the list for this app. Ask Chris to add it.";
  }
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email first — open the link we sent you when you signed up.';
  }
  if (/already registered|already been registered|already exists/i.test(message)) {
    return 'There is already an account with this email. Log in instead.';
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Couldn't reach the sign-in service. Check your internet connection and try again.";
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts in a short time. Wait a minute and try again.';
  }
  return message;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const primaryBtn =
  'w-full py-3.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer';
const secondaryBtn =
  'w-full py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-zinc-300 text-zinc-900 dark:text-zinc-100 font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer';
const inputClass =
  'w-full px-4 py-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-zinc-300 outline-none font-bold text-sm';
const linkBtn = 'text-xs font-black text-zinc-600 dark:text-zinc-300 underline underline-offset-2 cursor-pointer';

/** The white card every sign-in page sits in, with the logo on top. */
const AuthCard: React.FC<{ children: React.ReactNode; onBack?: () => void }> = ({ children, onBack }) => {
  // The app sets light/dark itself once it loads; before that, follow the device.
  useEffect(() => {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', !!prefersDark);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center px-4 py-6 font-sans overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xs p-6 sm:p-8 space-y-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute top-4 left-4 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col items-center text-center gap-2">
          <AppLogo size="xl" />
          <h1 className="text-xl font-black tracking-tight">DeutschMeister</h1>
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 -mt-1.5">Chris Personal App</p>
        </div>
        {children}
      </div>
    </div>
  );
};

const PasswordInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: 'current-password' | 'new-password';
}> = ({ value, onChange, placeholder, autoComplete }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const ErrorBox: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-200">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  ) : null;

const SuccessBox: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 text-center space-y-2">
    <MailCheck className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
    <p className="font-black text-sm text-emerald-900 dark:text-emerald-100">{title}</p>
    <p className="text-xs font-medium text-emerald-800/90 dark:text-emerald-300/90">{children}</p>
  </div>
);

const OrDivider = () => (
  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-zinc-400">
    <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    or
    <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
  </div>
);

// ---------------------------------------------------------------------------
// Sign-in flow: choose → log in / sign up / forgot password
// ---------------------------------------------------------------------------

type View = 'choose' | 'login' | 'signup' | 'forgot';

interface LoginScreenProps {
  /** An error to show on arrival, e.g. a refused Google sign-in coming back from the redirect. */
  initialError?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialError = null }) => {
  const [view, setView] = useState<View>(initialError ? 'login' : 'choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const go = (next: View) => {
    setView(next);
    setError(null);
    setSentTo(null);
    setPassword('');
    setConfirm('');
  };

  const origin = window.location.origin;

  if (!supabase) {
    return (
      <AuthCard>
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-sm space-y-1.5">
          <p className="font-black text-amber-900 dark:text-amber-200">Login isn't connected yet</p>
          <p className="text-amber-800/90 dark:text-amber-300/90 text-xs font-medium">
            The Supabase keys are missing. Add <code className="font-bold">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> to <code className="font-bold">.env.local</code>{' '}
            (or to Vercel's environment variables), then reload. Steps are in SETUP-LOGIN.md.
          </p>
        </div>
      </AuthCard>
    );
  }
  const auth = supabase.auth;

  const run = async (task: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = () =>
    run(async () => {
      const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin } });
      // On success the browser is already leaving for Google; only failures come back here.
      if (error) throw error;
    });

  const logIn = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const { error } = await auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // Success: AuthGate sees the new session and opens the app.
    });
  };

  const signUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    return run(async () => {
      const address = email.trim();
      const { data, error } = await auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: origin },
      });
      if (error) throw error;
      // With email confirmation on, Supabase answers an existing address with an
      // empty identity list instead of an error, so nobody can probe who has an account.
      if (data.user && data.user.identities?.length === 0) {
        throw new Error('already registered');
      }
      // No session yet means the confirmation email is on its way.
      if (!data.session) setSentTo(address);
    });
  };

  const sendReset = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const address = email.trim();
      const { error } = await auth.resetPasswordForEmail(address, { redirectTo: `${origin}/?${RESET_FLAG}=1` });
      if (error) throw error;
      setSentTo(address);
    });
  };

  const emailField = (
    <input
      type="email"
      required
      autoComplete="email"
      inputMode="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={inputClass}
    />
  );

  const googleButton = (
    <button type="button" onClick={continueWithGoogle} disabled={busy} className={secondaryBtn}>
      <GoogleMark />
      <span>Continue with Google</span>
    </button>
  );

  // --- Step 1: choose -------------------------------------------------------
  if (view === 'choose') {
    return (
      <AuthCard>
        <div className="space-y-3">
          <button type="button" onClick={() => go('login')} className={primaryBtn}>
            Log in
          </button>
          <button type="button" onClick={() => go('signup')} className={secondaryBtn}>
            Sign up
          </button>
        </div>
      </AuthCard>
    );
  }

  // --- Log in ---------------------------------------------------------------
  if (view === 'login') {
    return (
      <AuthCard onBack={() => go('choose')}>
        <div className="space-y-4">
          <h2 className="text-center font-black text-lg">Log in</h2>
          {googleButton}
          <OrDivider />
          <form onSubmit={logIn} className="space-y-2.5">
            {emailField}
            <PasswordInput value={password} onChange={setPassword} placeholder="Password" autoComplete="current-password" />
            <button type="submit" disabled={busy || !email.trim() || !password} className={primaryBtn}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Log in</span>
            </button>
          </form>
          <ErrorBox message={error} />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => go('forgot')} className={linkBtn}>
              Forgot password?
            </button>
            <button type="button" onClick={() => go('signup')} className={linkBtn}>
              Create an account
            </button>
          </div>
        </div>
      </AuthCard>
    );
  }

  // --- Sign up --------------------------------------------------------------
  if (view === 'signup') {
    return (
      <AuthCard onBack={() => go('choose')}>
        <div className="space-y-4">
          <h2 className="text-center font-black text-lg">Create your account</h2>
          {sentTo ? (
            <>
              <SuccessBox title="Confirm your email">
                We sent a link to <span className="font-bold">{sentTo}</span>. Open it and you're signed in.
              </SuccessBox>
              <button type="button" onClick={() => go('login')} className={secondaryBtn}>
                Go to log in
              </button>
            </>
          ) : (
            <>
              {googleButton}
              <OrDivider />
              <form onSubmit={signUp} className="space-y-2.5">
                {emailField}
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                  autoComplete="new-password"
                />
                <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat password" autoComplete="new-password" />
                <button type="submit" disabled={busy || !email.trim() || !password || !confirm} className={primaryBtn}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Sign up</span>
                </button>
              </form>
              <ErrorBox message={error} />
              <p className="text-center">
                <button type="button" onClick={() => go('login')} className={linkBtn}>
                  Already have an account? Log in
                </button>
              </p>
            </>
          )}
        </div>
      </AuthCard>
    );
  }

  // --- Forgot password ------------------------------------------------------
  return (
    <AuthCard onBack={() => go('login')}>
      <div className="space-y-4">
        <h2 className="text-center font-black text-lg">Reset your password</h2>
        {sentTo ? (
          <SuccessBox title="Check your inbox">
            If <span className="font-bold">{sentTo}</span> has an account, a reset link is on its way. Open it on this
            device to choose a new password.
          </SuccessBox>
        ) : (
          <>
            <p className="text-xs font-medium text-zinc-500 text-center">
              Enter your email and we'll send you a link to choose a new password.
            </p>
            <form onSubmit={sendReset} className="space-y-2.5">
              {emailField}
              <button type="submit" disabled={busy || !email.trim()} className={primaryBtn}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Send reset link</span>
              </button>
            </form>
            <ErrorBox message={error} />
          </>
        )}
      </div>
    </AuthCard>
  );
};

// ---------------------------------------------------------------------------
// Shown after opening a password-reset link
// ---------------------------------------------------------------------------

export const SetPasswordScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
    else setSaved(true);
  };

  return (
    <AuthCard>
      <div className="space-y-4">
        <h2 className="text-center font-black text-lg">Choose a new password</h2>
        {saved ? (
          <>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="font-black text-sm text-emerald-900 dark:text-emerald-100">Password changed</p>
            </div>
            <button type="button" onClick={onDone} className={primaryBtn}>
              Continue
            </button>
          </>
        ) : (
          <>
            <form onSubmit={save} className="space-y-2.5">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                autoComplete="new-password"
              />
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat new password" autoComplete="new-password" />
              <button type="submit" disabled={busy || !password || !confirm} className={primaryBtn}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save new password</span>
              </button>
            </form>
            <ErrorBox message={error} />
          </>
        )}
      </div>
    </AuthCard>
  );
};

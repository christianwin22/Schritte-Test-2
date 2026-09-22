import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, MailCheck, Mail, FlaskConical, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppLogo } from './AppLogo';
import { forgetAccount, getKnownAccounts, KnownAccount } from '../lib/progressSync';

/** Turns Supabase's error text into something a learner can act on. */
export function friendlyAuthError(message: string): string {
  if (/database error saving new user|not allowed/i.test(message)) {
    return "This email isn't on the list for this app. Ask Chris to add it.";
  }
  if (/expired|invalid.*(link|token)|otp/i.test(message)) {
    return 'That sign-in link has expired or was already used. Ask for a new one.';
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Couldn't reach the sign-in service. Check your internet connection and try again.";
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many sign-in emails in a short time. Wait a minute and try again.';
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

// Soft grey buttons, the same style the app uses for "Settings & Preferences",
// rather than solid black on white.
const mainBtn =
  'w-full py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-zinc-100 cursor-pointer';
const googleBtn =
  'w-full py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer';
// Sandbox is for testing, so it is lighter than Log in, but still clearly a button.
const sandboxBtn =
  'w-full py-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer';
const inputClass =
  'w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none font-bold text-sm';

/** The white card every sign-in page sits in. */
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
            className="absolute top-5 left-4 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

const Brand = () => (
  <div className="flex flex-col items-center text-center gap-2">
    <AppLogo size="xl" />
    <h1 className="text-xl font-black tracking-tight">DeutschMeister</h1>
    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 -mt-1.5">Chris Personal App</p>
  </div>
);

// ---------------------------------------------------------------------------
// Sign-in flow: first page → log in
// ---------------------------------------------------------------------------

interface LoginScreenProps {
  /** An error to show on arrival, e.g. a refused Google sign-in or an expired link. */
  initialError?: string | null;
  /** Open the sandbox: a private test area whose data never touches an account. */
  onOpenSandbox: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialError = null, onOpenSandbox }) => {
  const [step, setStep] = useState<'welcome' | 'login' | 'sandbox'>(initialError ? 'login' : 'welcome');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [knownAccounts, setKnownAccounts] = useState<KnownAccount[]>(getKnownAccounts);

  // --- Sandbox: second page, like Log in ------------------------------------
  if (step === 'sandbox') {
    return (
      <AuthCard onBack={() => setStep('welcome')}>
        <h2 className="text-center font-black text-xl pt-1.5">Sandbox</h2>
        <p className="text-sm font-bold text-center text-zinc-500 dark:text-zinc-400">
          Test new updates here.
          <br />
          Nothing is saved to your account.
        </p>
        <button type="button" onClick={onOpenSandbox} className={mainBtn}>
          <FlaskConical className="w-4 h-4" />
          <span>Enter sandbox</span>
        </button>
      </AuthCard>
    );
  }

  if (!supabase) {
    return (
      <AuthCard>
        <Brand />
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-sm space-y-1.5">
          <p className="font-black text-amber-900 dark:text-amber-200">Login isn't connected yet</p>
          <p className="text-amber-800/90 dark:text-amber-300/90 text-xs font-medium">
            The Supabase keys are missing. Add <code className="font-bold">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> to <code className="font-bold">.env.local</code>{' '}
            (or to Vercel's environment variables), then reload. Steps are in SETUP-LOGIN.md.
          </p>
        </div>
        <button type="button" onClick={() => setStep('sandbox')} className={sandboxBtn}>
          <FlaskConical className="w-4 h-4" />
          <span>Sandbox</span>
        </button>
      </AuthCard>
    );
  }
  const auth = supabase.auth;
  const redirectTo = window.location.origin;

  // --- First page -----------------------------------------------------------
  if (step === 'welcome') {
    return (
      <AuthCard>
        <Brand />
        <div className="space-y-2">
          <button type="button" onClick={() => setStep('login')} className={mainBtn}>
            Log in
          </button>
          <button type="button" onClick={() => setStep('sandbox')} className={sandboxBtn}>
            <FlaskConical className="w-4 h-4" />
            <span>Sandbox</span>
          </button>
        </div>
      </AuthCard>
    );
  }

  // --- Log in ---------------------------------------------------------------
  const continueWithGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    // On success the browser is already leaving for Google; only failures come back here.
    if (error) {
      setError(friendlyAuthError(error.message));
      setBusy(false);
    }
  };

  /** One tap back into an account used on this device. It still confirms: Google asks once, email sends a link. */
  const continueAs = async (account: KnownAccount) => {
    setError(null);
    setBusy(true);
    if (account.provider === 'google') {
      const { error } = await auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { login_hint: account.email } },
      });
      if (error) {
        setError(friendlyAuthError(error.message));
        setBusy(false);
      }
      return;
    }
    const { error } = await auth.signInWithOtp({ email: account.email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
    else setSentTo(account.email);
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    setError(null);
    setBusy(true);
    // The first link creates the account; every later one just signs in.
    const { error } = await auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
    else setSentTo(address);
  };

  return (
    <AuthCard
      onBack={() => {
        setStep('welcome');
        setError(null);
        setSentTo(null);
      }}
    >
      <h2 className="text-center font-black text-xl pt-1.5">Log in</h2>

      {sentTo ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 text-center space-y-2">
            <MailCheck className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="font-black text-sm text-emerald-900 dark:text-emerald-100">Check your inbox</p>
            <p className="text-xs font-medium text-emerald-800/90 dark:text-emerald-300/90">
              We sent a sign-in link to <span className="font-bold">{sentTo}</span>. Open it on this device and you're in.
            </p>
          </div>
          <button type="button" onClick={() => setSentTo(null)} className={mainBtn}>
            Use a different email
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {knownAccounts.length > 0 && (
            <>
              <div className="space-y-2">
                {knownAccounts.map((account) => {
                  const label = account.name || account.email.split('@')[0];
                  return (
                    <div key={account.email} className="relative">
                      <button
                        type="button"
                        onClick={() => continueAs(account)}
                        disabled={busy}
                        className="w-full p-3 pr-11 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-3 text-left transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                      >
                        <span className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center font-black text-sm shrink-0">
                          {label.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">
                            Continue as {label}
                          </span>
                          <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                            {account.email}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          forgetAccount(account.email);
                          setKnownAccounts(getKnownAccounts());
                        }}
                        aria-label={`Remove ${account.email} from this device`}
                        title="Remove from this device"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-600/60 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                or use another account
                <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </>
          )}

          <button type="button" onClick={continueWithGoogle} disabled={busy} className={googleBtn}>
            <GoogleMark />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-zinc-400">
            <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            or
            <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={sendLink} className="space-y-2.5">
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
            <button type="submit" disabled={busy || !email.trim()} className={mainBtn}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
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
    </AuthCard>
  );
};

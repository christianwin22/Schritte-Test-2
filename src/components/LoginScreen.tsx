import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, MailCheck, Mail, FlaskConical, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppLogo } from './AppLogo';
import { forgetAccount, knownAccounts, type KnownAccount } from '../lib/knownAccounts';

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

/** The yellow "Sandbox · test" tag — same place on every page, the app's and the login's. */
export const SandboxTag = () => (
  <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black uppercase tracking-wider shadow-sm">
    Sandbox · test
  </div>
);

/** Small heading that splits the Log in page into its two parts. */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-1">{children}</p>
);

const Brand = () => (
  <div className="flex flex-col items-center text-center gap-2">
    <AppLogo size="xl" />
    <h1 className="text-xl font-black tracking-tight">DeutschMeister</h1>
    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 -mt-1.5">Chris Family App</p>
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

/**
 * Sign-in links by email are switched off: they open in Safari, so they can
 * never sign you into the app installed on a home screen. Google comes back
 * into the same window. Flip this to true to bring the email form back.
 */
const EMAIL_SIGN_IN = false;

/** One remembered account, offered on the first page. */
const AccountRow: React.FC<{
  account: KnownAccount;
  busy: boolean;
  onPick: () => void;
  onForget: () => void;
}> = ({ account, busy, onPick, onForget }) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600 space-y-2.5">
        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
          Remove <span className="font-black">{account.email}</span> from this device?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex-1 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs cursor-pointer"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onForget}
            className="flex-1 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 font-black text-xs cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
  <div className="w-full p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
    <button
      type="button"
      disabled={busy}
      onClick={onPick}
      className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer disabled:opacity-60"
    >
      {account.picture ? (
        <img src={account.picture} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover" />
      ) : (
        <span className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center font-black text-sm shrink-0">
          {account.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{account.name}</span>
        <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{account.email}</span>
      </span>
    </button>
    <button
      type="button"
      aria-label={`Forget ${account.email}`}
      title="Remove from this device"
      onClick={() => setConfirming(true)}
      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer shrink-0"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
  );
};

const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-200">
    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
);

/** The pretend account shown on the sandbox's practice Log in page. */
const SANDBOX_ACCOUNT = { email: 'test.user@sandbox.test', name: 'Test User' };

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialError = null, onOpenSandbox }) => {
  // 'sandbox-login' is a practice copy of the Log in page: same screens, but every
  // choice just opens the sandbox and nothing is sent anywhere.
  const [step, setStep] = useState<'welcome' | 'login' | 'sandbox-login'>(initialError ? 'login' : 'welcome');
  const [email, setEmail] = useState('');
  // Which button is working. One shared flag made Google's click spin the email one.
  const [busy, setBusy] = useState<null | 'google' | 'email'>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Anyone who has signed in on this device before, offered back by name.
  const [accounts, setAccounts] = useState<KnownAccount[]>(() => knownAccounts());

  const isSandbox = step === 'sandbox-login';
  const auth = supabase?.auth ?? null;
  const redirectTo = window.location.origin;

  const openLoginPage = (next: 'login' | 'sandbox-login') => {
    setStep(next);
    setError(null);
    setSentTo(null);
    setEmail('');
  };

  if (!auth && !isSandbox) {
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
        <button type="button" onClick={() => openLoginPage('sandbox-login')} className={sandboxBtn}>
          <FlaskConical className="w-4 h-4" />
          <span>Sandbox</span>
        </button>
      </AuthCard>
    );
  }

  // --- First page -----------------------------------------------------------
  if (step === 'welcome') {
    return (
      <AuthCard>
        <Brand />
        {accounts.length > 0 && (
          <div className="space-y-2">
            {accounts.map((account) => (
              <AccountRow
                key={account.email}
                account={account}
                busy={!!busy}
                onPick={() => continueAs(account)}
                onForget={() => {
                  forgetAccount(account.email);
                  setAccounts(knownAccounts());
                }}
              />
            ))}
          </div>
        )}
        <div className="space-y-2">
          <button type="button" onClick={() => openLoginPage('login')} className={accounts.length > 0 ? sandboxBtn : mainBtn}>
            {accounts.length > 0 ? 'Use another account' : 'Log in'}
          </button>
          <button type="button" onClick={() => openLoginPage('sandbox-login')} className={sandboxBtn}>
            <FlaskConical className="w-4 h-4" />
            <span>Sandbox</span>
          </button>
        </div>
        {error && <ErrorNote message={error} />}
      </AuthCard>
    );
  }

  // --- Log in (real, or the sandbox's practice copy) --------------------------
  const continueWithGoogle = async () => {
    if (isSandbox) return onOpenSandbox();
    if (!auth) return;
    setError(null);
    setBusy('google');
    // No login_hint. Pointing Google at one address skipped its chooser, and
    // when that address had no Google session in this browser the flow stopped
    // there and never came back — the auth log showed authorize with no
    // callback. Google's own chooser is one extra tap and always returns.
    const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    // On success the browser is already leaving for Google; only failures come back here.
    if (error) {
      setError(friendlyAuthError(error.message));
      setBusy(null);
    }
  };

  /** Taps on a remembered account: the same way they came in last time. */
  const continueAs = async (account: KnownAccount) => {
    if (account.via === 'google' || !EMAIL_SIGN_IN) return continueWithGoogle();
    await sendLinkTo(account.email);
  };

  const sendLinkTo = async (address: string) => {
    if (isSandbox) {
      setSentTo(address); // pretend: nothing is sent
      return;
    }
    if (!auth) return;
    setError(null);
    setBusy('email');
    // The first link creates the account; every later one just signs in.
    const { error } = await auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirectTo } });
    setBusy(null);
    if (error) setError(friendlyAuthError(error.message));
    else setSentTo(address);
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    await sendLinkTo(address);
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
              {isSandbox ? (
                <>Test only — no email was sent to <span className="font-bold">{sentTo}</span>. Open the test link below.</>
              ) : (
                <>
                  We sent a sign-in link to <span className="font-bold">{sentTo}</span>. Open it on this device and you're in.
                </>
              )}
            </p>
          </div>
          {isSandbox && (
            <button type="button" onClick={onOpenSandbox} className={mainBtn}>
              <MailCheck className="w-4 h-4" />
              <span>Open the test link</span>
            </button>
          )}
          <button type="button" onClick={() => setSentTo(null)} className={isSandbox ? sandboxBtn : mainBtn}>
            Use a different email
          </button>
        </div>
      ) : (
        <div className={isSandbox ? 'space-y-6' : 'space-y-4'}>
          {/* Sandbox only: a pretend account, so the page can be practised in two parts */}
          {isSandbox && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenSandbox}
                className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center font-black text-sm shrink-0">
                  {SANDBOX_ACCOUNT.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">
                    {SANDBOX_ACCOUNT.name}
                  </span>
                  <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                    {SANDBOX_ACCOUNT.email}
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* Part 2: Google or email */}
          <div className="space-y-2.5">
            {isSandbox && <SectionTitle>Use another account</SectionTitle>}
            <button type="button" onClick={() => continueWithGoogle()} disabled={!!busy} className={googleBtn}>
              {busy === 'google' && <Loader2 className="w-4 h-4 animate-spin" />}
              <GoogleMark />
              <span>Continue with Google</span>
            </button>
            {EMAIL_SIGN_IN && !isSandbox && (
              <div className="flex items-center gap-3 py-1 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                or
                <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>
            )}
            {EMAIL_SIGN_IN && (
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
              <button type="submit" disabled={!!busy || !email.trim()} className={mainBtn}>
                {busy === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Email me a sign-in link</span>
              </button>
            </form>
            )}
          </div>
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {isSandbox && <SandboxTag />}
    </AuthCard>
  );
};

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, Smartphone, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  adoptRemote,
  enterSandbox,
  exitSandbox,
  pushSnapshot,
  clearAppData,
  restoreForUser,
  signOutAndClear,
  startAutoSync,
  takeSnapshot,
  type OtherDeviceEvent,
} from '../lib/progressSync';
import { flushQueue } from '../lib/suggestions';
import {
  displayName,
  dropSession,
  keepSession,
  rememberAccount,
  switchableAccounts,
  type KnownAccount,
} from '../lib/knownAccounts';
import { LoginScreen, SandboxTag, friendlyAuthError } from './LoginScreen';

interface AuthContextValue {
  email: string | null;
  /** In the sandbox: test data on this device only, separate from any account. */
  isSandbox: boolean;
  /** Logs out, or leaves the sandbox; either way back to the login home page. Resolves false if logging out couldn't save. */
  leave: () => Promise<boolean>;
  /** Other accounts on this device that can be returned to without signing in. */
  otherAccounts?: KnownAccount[];
  /** Saves up, puts this account's session away, and opens another one. */
  switchTo?: (account: KnownAccount) => Promise<boolean>;
}

// Remembers being in the sandbox, so reopening the app returns there.
// Outside the synced key families on purpose.
const SANDBOX_KEY = 'cpa_sandbox';

function readSandboxFlag(): boolean {
  try {
    return localStorage.getItem(SANDBOX_KEY) === '1';
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in account, for screens that show it (Settings). Null outside the gate. */
export const useAuth = () => useContext(AuthContext);

type Phase = 'checking' | 'signed-out' | 'restoring' | 'ready' | 'restore-failed';

/** A refused Google sign-in or an expired email link comes back as ?error_description=… — read it once, then tidy the URL. */
function takeAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = params.get('error_description') || hash.get('error_description');
  if (!description) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return friendlyAuthError(description);
}

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400 font-sans">
    <Loader2 className="w-6 h-6 animate-spin" />
    <p className="text-xs font-bold">{label}</p>
  </div>
);

/**
 * Nothing inside renders until someone is signed in and their saved progress
 * has been copied into this browser. The app's screens read that progress on
 * mount, so restoring first means they start with the right data.
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');
  const [urlError] = useState(takeAuthErrorFromUrl);
  const [isSandbox, setIsSandbox] = useState(readSandboxFlag);
  const restoredFor = useRef<string | null>(null);
  /** Set when the saved progress has moved on under us, on another device. */
  const [otherDevice, setOtherDevice] = useState<OtherDeviceEvent | null>(null);
  const [syncRun, setSyncRun] = useState(0); // bumping this restarts the sync
  const [accounts, setAccounts] = useState<KnownAccount[]>([]);

  useEffect(() => {
    if (!supabase) {
      setPhase('signed-out');
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase asks that no other Supabase call runs inside this callback, so defer.
      setTimeout(() => {
        setSession(next);
        if (!next) {
          restoredFor.current = null;
          setPhase('signed-out');
          return;
        }
        if (restoredFor.current === next.user.id) return; // token refresh, same person
        restoredFor.current = next.user.id;
        // Offer this account back on the Log in page after a sign-out.
        const meta = (next.user.user_metadata ?? {}) as Record<string, unknown>;
        rememberAccount({
          email: next.user.email ?? '',
          name: displayName(next.user),
          via: next.user.app_metadata?.provider === 'google' ? 'google' : 'email',
          picture: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
        });
        setAccounts(switchableAccounts(next.user.email));
        setPhase('restoring');
        restoreForUser(next.user.id)
          .then(() => setPhase('ready'))
          .catch((err) => {
            console.error('Could not load saved progress', err);
            restoredFor.current = null;
            setPhase('restore-failed');
          });
      }, 0);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (phase !== 'ready' || !userId) return;
    // Ideas noted in the Sandbox or offline go up now that we're signed in.
    void flushQueue();
    return startAutoSync(userId, 4000, setOtherDevice);
  }, [phase, userId, syncRun]);

  if (phase === 'checking') return <Splash label="Loading…" />;
  if (phase === 'restoring') return <Splash label="Loading your progress…" />;

  if (!userId && isSandbox) {
    const sandbox: AuthContextValue = {
      email: null,
      isSandbox: true,
      leave: async () => {
        // Whatever happens while tidying up, you still leave.
        try {
          exitSandbox();
        } catch (err) {
          console.warn('Could not keep the sandbox data', err);
        }
        localStorage.removeItem(SANDBOX_KEY);
        setIsSandbox(false);
        return true;
      },
    };
    return (
      <AuthContext.Provider value={sandbox}>
        {children}
        <SandboxTag />
      </AuthContext.Provider>
    );
  }

  if (phase === 'signed-out' || !userId) {
    return (
      <LoginScreen
        initialError={urlError}
        onOpenSandbox={() => {
          enterSandbox();
          localStorage.setItem(SANDBOX_KEY, '1');
          setIsSandbox(true);
        }}
      />
    );
  }

  if (phase === 'restore-failed') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 flex items-center justify-center px-4 font-sans">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 p-6 text-center space-y-3">
          <WifiOff className="w-6 h-6 mx-auto text-zinc-500" />
          <p className="font-black text-zinc-900 dark:text-zinc-100">Couldn't load your progress</p>
          <p className="text-xs font-medium text-zinc-500">Check your internet connection, then try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const email = session?.user.email ?? null;

  const value: AuthContextValue = {
    email,
    isSandbox: false,
    leave: async () => {
      // Logging out really logs out: the way back in has to be a real sign-in.
      if (email) dropSession(email);
      const ok = await signOutAndClear(userId);
      if (ok) window.location.reload();
      return ok;
    },
    otherAccounts: accounts,
    /**
     * Swaps accounts without a trip to Google. This account's progress goes up
     * first and its session is put away, then the other one's session is put
     * back. Nothing is thrown away on either side.
     */
    switchTo: async (account) => {
      if (!supabase || !account.session) return false;
      const saved = await pushSnapshot(userId, takeSnapshot());
      if (!saved) return false; // offline: don't move while work is unsaved
      const current = (await supabase.auth.getSession()).data.session;
      if (email && current) {
        keepSession(email, {
          access_token: current.access_token,
          refresh_token: current.refresh_token,
        });
      }
      clearAppData(); // the next account's own progress arrives on restore
      const { error } = await supabase.auth.setSession(account.session);
      if (error) {
        console.warn('Could not switch account', error.message);
        return false;
      }
      window.location.reload();
      return true;
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {otherDevice && (
        <OtherDeviceNotice
          hasLocalChanges={otherDevice.hasLocalChanges}
          onTakeOther={async () => {
            await adoptRemote(userId);
            window.location.reload();
          }}
          onKeepThis={async () => {
            await pushSnapshot(userId, takeSnapshot());
            setOtherDevice(null);
            setSyncRun((n) => n + 1); // start saving again
          }}
        />
      )}
    </AuthContext.Provider>
  );
};

/**
 * Shown when the same account has been used somewhere else since this device
 * last saved. Saving stops until it is answered, so neither side is silently
 * written over.
 */
const OtherDeviceNotice: React.FC<{
  hasLocalChanges: boolean;
  onTakeOther: () => void;
  onKeepThis: () => void;
}> = ({ hasLocalChanges, onTakeOther, onKeepThis }) => (
  <div className="fixed inset-x-0 bottom-0 z-[60] p-3 font-sans">
    <div className="mx-auto max-w-md bg-white dark:bg-zinc-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl shadow-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">
            You've been studying on another device
          </p>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            {hasLocalChanges
              ? 'This device has work of its own that is not saved yet. Keep which one?'
              : 'Catch this device up to your latest progress.'}
          </p>
        </div>
      </div>

      {hasLocalChanges ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTakeOther}
            className="flex-1 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs cursor-pointer"
          >
            Use the other device
          </button>
          <button
            type="button"
            onClick={onKeepThis}
            className="flex-1 py-2.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs cursor-pointer"
          >
            Keep this one
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onTakeOther}
          className="w-full py-2.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs cursor-pointer"
        >
          Catch up
        </button>
      )}
    </div>
  </div>
);

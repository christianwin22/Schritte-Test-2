import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import './index.css';

/**
 * Keeps the app as tall as the part of the screen you can see.
 *
 * On a phone the keyboard slides over the page instead of shortening it, so
 * without this the top of a card — the direction and the counter — sits behind
 * the keyboard while you type. visualViewport reports the visible height, and
 * the layout follows it.
 */
function trackVisibleHeight(): void {
  const vv = window.visualViewport;
  const apply = () => {
    const height = vv?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
    /*
     * Rows marked hide-when-tight step aside only when there is genuinely no
     * room for them. With a keyboard up on a normal phone there still is — the
     * whole card ends around 480px — so the mode and filter bars stay. On a
     * small phone they go, because the Check button matters more.
     */
    document.documentElement.dataset.tight = height < 490 ? '1' : '0';
    // iOS may scroll the page to chase the focused box. The layout already
    // fits the space, so any scrolling just hides the top of the card.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };
  apply();
  vv?.addEventListener('resize', apply);
  vv?.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
}

trackVisibleHeight();

/** The built file this page is running, e.g. "index-qMRVgsDu.js". */
export function runningBuild(): string {
  const src = [...document.querySelectorAll('script[src]')]
    .map((s) => (s as HTMLScriptElement).src)
    .find((s) => s.includes('/assets/'));
  return src ? src.split('/').pop() ?? 'dev' : 'dev';
}

/**
 * Picks up a new version by itself.
 *
 * Installed on a home screen there is no address bar and no reload button, and
 * iOS can keep serving the page it first loaded long after a new one is out —
 * which is how a fixed bug can look unfixed for days. So on every start, and
 * whenever you come back to the app, it asks the server which build is current
 * and reloads once if it is not the one running.
 */
async function updateIfStale(): Promise<void> {
  const current = runningBuild();
  if (current === 'dev') return;
  // Never in the middle of signing in. Google comes back with a one-time code
  // in the address; reloading then asks to swap a code that has already been
  // spent, and the sign-in is lost — which looks exactly like being unable to
  // log in. Any update can wait for the next quiet moment.
  if (/[?&]code=|[?&]error=/.test(window.location.search) || window.location.hash.includes('access_token')) {
    return;
  }
  try {
    const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
    const latest = html.match(/index-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!latest || latest === current) return;
    // Once per new build, so a mismatch we cannot resolve can't loop.
    if (sessionStorage.getItem('cpa_reloaded_for') === latest) return;
    sessionStorage.setItem('cpa_reloaded_for', latest);
    window.location.reload();
  } catch {
    // offline: carry on with what is already here
  }
}

void updateIfStale();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void updateIfStale();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);

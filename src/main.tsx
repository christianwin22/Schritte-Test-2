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
    // A big bite out of the screen means the keyboard is up. Rows marked
    // kbd-hide step aside so the card and its buttons still fit.
    const keyboardUp = height < window.innerHeight * 0.75;
    document.documentElement.dataset.kbd = keyboardUp ? 'up' : 'down';
  };
  apply();
  vv?.addEventListener('resize', apply);
  vv?.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
}

trackVisibleHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);

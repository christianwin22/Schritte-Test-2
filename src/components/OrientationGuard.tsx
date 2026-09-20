import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, RotateCw, Tablet, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AppLanguage } from '../utils/translations';

interface OrientationGuardProps {
  appLanguage?: AppLanguage;
}

/**
 * Accurately determines if the current device is a tablet or desktop device,
 * which are permitted to rotate freely.
 *
 * Phones (iPhone, Android phones) have a shortest physical/viewport dimension < 600px
 * (e.g. iPhone 16 Pro Max = 440px, Pixel 8 = 412px, iPhone SE = 375px).
 * Tablets (iPad Mini = 768px, iPad Pro = 834px-1024px, Android tablets = 600px+)
 * have their shortest dimension >= 600px.
 */
export const isTabletOrDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const screenW = window.screen?.width || window.innerWidth;
  const screenH = window.screen?.height || window.innerHeight;
  const minDimension = Math.min(window.innerWidth, window.innerHeight);
  const minScreenDimension = Math.min(screenW, screenH);

  // iPad detection (including iPadOS where userAgent reports as Macintosh with multi-touch)
  const isIPad =
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && minScreenDimension >= 700);

  // Android tablets: user agent contains Android without "Mobile", or Android with physical short edge >= 600px
  const isAndroidTablet =
    (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
    (/Android/i.test(ua) && minScreenDimension >= 600);

  // General tablet dimension check: shortest edge (either screen or window) is >= 600px
  const isTabletDimensions = minScreenDimension >= 600 || minDimension >= 600;

  // Desktop or laptop (large display, or mouse-driven pointer with no touch)
  const isDesktop = minDimension >= 600 && (minScreenDimension >= 650 || navigator.maxTouchPoints === 0);

  return isIPad || isAndroidTablet || isTabletDimensions || isDesktop;
};

export const OrientationGuard: React.FC<OrientationGuardProps> = ({
  appLanguage = 'en',
}) => {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  const evaluateOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check current orientation
    const isLandscape = window.innerWidth > window.innerHeight;
    const isTablet = isTabletOrDesktopDevice();

    // Phones in landscape mode are blocked.
    // Tablets and desktops are explicitly allowed to rotate.
    if (isLandscape && !isTablet) {
      setIsMobileLandscape(true);

      // Attempt programmatic lock if supported (e.g., modern Chrome / Android standalone PWA)
      if (
        'screen' in window &&
        'orientation' in window.screen &&
        'lock' in (window.screen.orientation as any)
      ) {
        try {
          (window.screen.orientation as any).lock('portrait').catch(() => {
            // Ignored if user hasn't interacted or browser restricts
          });
        } catch {
          // Unsupported browser gracefully continues
        }
      }
    } else {
      setIsMobileLandscape(false);
    }
  }, []);

  useEffect(() => {
    evaluateOrientation();

    // Listen to all possible resize and orientation changes
    window.addEventListener('resize', evaluateOrientation, { passive: true });
    window.addEventListener('orientationchange', evaluateOrientation, { passive: true });

    // Listen to media query orientation changes for instant response
    const mql = window.matchMedia('(orientation: landscape)');
    const handleMqlChange = () => evaluateOrientation();
    try {
      mql.addEventListener('change', handleMqlChange);
    } catch {
      mql.addListener(handleMqlChange);
    }

    return () => {
      window.removeEventListener('resize', evaluateOrientation);
      window.removeEventListener('orientationchange', evaluateOrientation);
      try {
        mql.removeEventListener('change', handleMqlChange);
      } catch {
        mql.removeListener(handleMqlChange);
      }
    };
  }, [evaluateOrientation]);

  if (!isMobileLandscape) return null;

  const isEn = appLanguage === 'en';

  return (
    <div
      id="orientation-guard-overlay"
      className="fixed inset-0 z-[99999] bg-[#1a1d24]/98 backdrop-blur-xl text-white flex flex-col items-center justify-center p-6 text-center select-none touch-none animate-fadeIn"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Visual Rotating Phone Indicator */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Glowing background ring */}
        <div className="absolute w-24 h-24 rounded-full bg-emerald-500/15 animate-ping opacity-60" />
        
        <div className="relative w-20 h-20 rounded-3xl bg-zinc-900/90 border border-emerald-500/30 shadow-2xl flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Phone icon with tilting animation */}
            <Smartphone className="w-10 h-10 text-emerald-400 animate-pulse" />
            <RotateCw className="w-5 h-5 text-emerald-300 absolute -top-1 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
      </div>

      {/* Main Warning Title */}
      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 max-w-xs">
        {isEn ? 'Portrait Mode Required' : 'Hochformat erforderlich'}
      </h2>

      {/* Clear explanation */}
      <p className="text-sm text-zinc-300 max-w-xs leading-relaxed font-normal mb-5">
        {isEn
          ? 'On mobile phones, please hold your device vertically in Portrait mode for optimal study ergonomics.'
          : 'Auf Smartphones halte dein Gerät bitte aufrecht im Hochformat für optimales Lernen.'}
      </p>

      {/* Device Policy Legend */}
      <div className="w-full max-w-xs bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 text-xs text-left shadow-lg">
        {/* Phone Rule */}
        <div className="flex items-center justify-between gap-2 text-zinc-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{isEn ? 'Smartphones' : 'Smartphones'}</span>
          </div>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {isEn ? 'Portrait only' : 'Nur Hochformat'}
          </span>
        </div>

        {/* Tablet Rule */}
        <div className="flex items-center justify-between gap-2 text-zinc-400 border-t border-zinc-800/80 pt-2">
          <div className="flex items-center gap-2">
            <Tablet className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold text-zinc-300">{isEn ? 'iPads & Tablets' : 'iPads & Tablets'}</span>
          </div>
          <div className="flex items-center gap-1 text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isEn ? 'All rotations allowed' : 'Alle Drehungen erlaubt'}</span>
          </div>
        </div>
      </div>

      {/* Subtle Hint */}
      <div className="mt-5 flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
        <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
        <span>
          {isEn
            ? 'Rotate your phone 90° to resume your lesson'
            : 'Drehe dein Smartphone um 90°, um fortzufahren'}
        </span>
      </div>
    </div>
  );
};

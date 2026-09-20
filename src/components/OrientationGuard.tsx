import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';
import { AppLanguage } from '../utils/translations';

interface OrientationGuardProps {
  appLanguage?: AppLanguage;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({
  appLanguage = 'en',
}) => {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if device is a mobile phone in landscape:
      // Phone characteristics: height <= 520px and width <= 950px in landscape mode with touch capability,
      // while Tablets (e.g. iPad min 768px/1024px or height >= 580px) and desktops are unblocked.
      const isLandscape = window.innerWidth > window.innerHeight;
      const isShortHeight = window.innerHeight <= 500;
      const isNarrowWidth = window.innerWidth <= 950;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (isLandscape && isShortHeight && isNarrowWidth && hasTouch) {
        setIsMobileLandscape(true);
      } else {
        setIsMobileLandscape(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isMobileLandscape) return null;

  return (
    <div className="fixed inset-0 z-100 bg-zinc-950/95 text-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4 shadow-lg animate-bounce">
        <RotateCw className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-black tracking-tight mb-2">
        {appLanguage === 'en'
          ? 'Please Rotate to Portrait'
          : 'Bitte ins Hochformat drehen'}
      </h2>
      <p className="text-sm text-zinc-300 max-w-sm font-medium leading-relaxed">
        {appLanguage === 'en'
          ? 'On mobile phones, please hold your phone in Portrait mode for the best learning experience. (Tablets support all orientations).'
          : 'Auf Smartphones halte dein Gerät bitte im Hochformat für das beste Lernerlebnis. (Tablets unterstützen alle Ausrichtungen).'}
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400 font-bold">
        <Smartphone className="w-4 h-4" />
        <span>Portrait Mode Recommended</span>
      </div>
    </div>
  );
};


import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* White Minimalist Geometric Logo Tile with Fading Black Steps */}
      <div
        className={`${sizeClasses} rounded-xl bg-white text-zinc-950 flex items-center justify-center shadow-xs border border-zinc-300 dark:border-zinc-200 relative overflow-hidden group`}
      >
        {/* Stylized Ascending Steps (Schritte) in Fading Black on Pure White */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-zinc-950"
        >
          {/* Step 1 (Faded black / light step) */}
          <rect x="5" y="19" width="6" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
          {/* Step 2 (Medium black step) */}
          <rect x="13" y="12" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.7" />
          {/* Step 3 (Solid black mastery peak) */}
          <rect x="21" y="6" width="6" height="20" rx="1.5" fill="currentColor" opacity="1" />
          {/* Subtle Top Accent Dot in White */}
          <circle cx="24" cy="9" r="1.2" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-zinc-950 dark:text-white">
              Schritte Neu
            </span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              A1–B1
            </span>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase -mt-0.5">
            International
          </span>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface UmlautHelperProps {
  onInsert: (char: string) => void;
  className?: string;
}

export const UmlautHelper: React.FC<UmlautHelperProps> = ({ onInsert, className = '' }) => {
  const characters = ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'];

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`} id="umlaut-helper-bar">
      <span className="text-xs text-slate-400 mr-1 font-medium select-none">
        Umlaute:
      </span>
      {characters.map((char) => (
        <button
          key={char}
          type="button"
          id={`btn-umlaut-${char}`}
          onClick={() => onInsert(char)}
          className="px-2.5 py-1 text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer"
          title={`Insert "${char}"`}
        >
          {char}
        </button>
      ))}
    </div>
  );
};

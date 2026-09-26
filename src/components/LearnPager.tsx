import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/audioEffects';

/**
 * A Learn page you move through without buttons:
 *
 *   Mac:            ← / → keys
 *   iPad, iPhone:   tap the left or right half, or swipe left / right
 *
 * Taps on a button inside (the speakers) stay with that button. Moving past the
 * last page calls onFinish. Each turn plays like a book page (index.css).
 */
interface LearnPagerProps {
  index: number;
  count: number;
  onChange: (next: number) => void;
  onFinish?: () => void;
  children: React.ReactNode;
  className?: string;
}

const SWIPE = 50;

export const LearnPager: React.FC<LearnPagerProps> = ({ index, count, onChange, onFinish, children, className = '' }) => {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  // Which way the last turn went, for the page-turn animation (0 = no turn yet)
  const [turn, setTurn] = useState<0 | 1 | -1>(0);

  const go = (step: 1 | -1) => {
    const next = index + step;
    if (next < 0) return;
    playSound('tap');
    setTurn(step);
    if (next >= count) onFinish?.();
    else onChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className={`select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          go(dx < 0 ? 1 : -1); // swipe left = next, as in Flashcard
        }
      }}
      onClick={(e) => {
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        if ((e.target as HTMLElement).closest('button')) return; // a speaker, not a page turn
        const box = e.currentTarget.getBoundingClientRect();
        go(e.clientX - box.left < box.width / 2 ? -1 : 1);
      }}
    >
      {/* A new key per page restarts the turn, so quick taps never wait for one to finish */}
      <div
        key={index}
        className={`flex-1 flex flex-col ${turn === 1 ? 'page-turn-next' : turn === -1 ? 'page-turn-back' : ''}`}
      >
        {children}
      </div>
    </div>
  );
};

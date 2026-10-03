import React, { useEffect, useRef, useState } from 'react';

interface ImageViewerProps {
  images: string[];
  /** Which one was tapped. */
  start: number;
  onClose: () => void;
}

const SWIPE = 70; // px before a swipe counts
const ANIM_MS = 220;

/**
 * Screenshots, full size. Tap to close. Swipe left/right for the next or
 * previous one — past the last (or first) it closes. Swipe up or down closes.
 * Pinch, double-tap or the mouse wheel zooms; zoomed in, a drag moves the image.
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ images, start, onClose }) => {
  const [index, setIndex] = useState(start);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // zoomed-in position
  const [drag, setDrag] = useState({ x: 0, y: 0 }); // swipe in progress
  const [anim, setAnim] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; pinch?: { dist: number; scale: number }; pan: { x: number; y: number } } | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);

  // Keys go to the viewer only — not to the note behind it or the exercise under that.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  /** Slides out the way it was swiped, then closes. */
  const close = (dx = 0, dy = 0) => {
    setAnim(true);
    setLeaving(true);
    setDrag({ x: dx * 4, y: dy * 4 });
    window.setTimeout(onClose, ANIM_MS);
  };

  /** Next (+1) or previous (-1); none left that way → close. */
  const go = (step: 1 | -1) => {
    const next = index + step;
    if (next < 0 || next >= images.length) {
      close(-step * window.innerWidth * 0.25, 0);
      return;
    }
    setAnim(true);
    setDrag({ x: -step * window.innerWidth, y: 0 }); // slide the current one out
    window.setTimeout(() => {
      setAnim(false);
      resetZoom();
      setIndex(next);
      setDrag({ x: step * window.innerWidth, y: 0 }); // the next one waits on the other side
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnim(true);
          setDrag({ x: 0, y: 0 });
        })
      );
    }, ANIM_MS);
  };

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnim(false);
    if (pointers.current.size === 2) {
      gesture.current = { x: 0, y: 0, moved: true, pinch: { dist: distance(), scale }, pan };
    } else if (pointers.current.size === 1) {
      gesture.current = { x: e.clientX, y: e.clientY, moved: false, pan };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.pinch && pointers.current.size === 2) {
      setScale(Math.min(5, Math.max(1, (g.pinch.scale * distance()) / g.pinch.dist)));
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (scale > 1) setPan({ x: g.pan.x + dx, y: g.pan.y + dy });
    else setDrag({ x: dx, y: dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g || pointers.current.size > 0) return;
    gesture.current = null;
    if (g.pinch) {
      if (scale <= 1.05) resetZoom();
      return;
    }
    if (!g.moved) {
      // One tap closes; two quick taps zoom in or out.
      const now = Date.now();
      if (now - lastTap.current < 280) {
        if (tapTimer.current) window.clearTimeout(tapTimer.current);
        lastTap.current = 0;
        setAnim(true);
        if (scale > 1) resetZoom();
        else setScale(2.5);
        return;
      }
      lastTap.current = now;
      tapTimer.current = window.setTimeout(() => close(), 280);
      return;
    }
    if (scale > 1) return; // that was moving the zoomed image
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
    else if (Math.abs(dy) > SWIPE) close(0, dy);
    else {
      setAnim(true);
      setDrag({ x: 0, y: 0 }); // not far enough: spring back
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(5, Math.max(1, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (next <= 1.01) resetZoom();
    else setScale(next);
  };

  // The farther a swipe goes up or down, the more the dark backdrop fades.
  const fade = leaving ? 0 : Math.max(0.3, 1 - Math.abs(drag.y) / 500);

  return (
    <div
      ref={box}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[70] outline-none flex items-center justify-center overflow-hidden touch-none select-none"
      style={{ backgroundColor: `rgba(0,0,0,${0.92 * fade})`, transition: anim ? `background-color ${ANIM_MS}ms ease-out` : undefined }}
      role="dialog"
      aria-modal="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <img
        src={images[index]}
        alt=""
        draggable={false}
        className="max-w-full max-h-full object-contain rounded-xl pointer-events-none"
        style={{
          transform: `translate(${drag.x + pan.x}px, ${drag.y + pan.y}px) scale(${scale})`,
          opacity: leaving ? 0 : 1,
          transition: anim ? `transform ${ANIM_MS}ms ease-out, opacity ${ANIM_MS}ms ease-out` : undefined,
        }}
      />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

'use client';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function AnimatedNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const { format } = useI18n();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const stop = () => { cancelAnimationFrame(frame); previous.current = value; setDisplay(value); };
    if (motion.matches) { stop(); return; }
    const start = performance.now();
    const from = previous.current;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 520);
      const current = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      setDisplay(current); previous.current = current;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const preferenceChanged = () => { if (motion.matches) stop(); };
    motion.addEventListener('change', preferenceChanged);
    return () => { cancelAnimationFrame(frame); motion.removeEventListener('change', preferenceChanged); };
  }, [value]);
  return <span className="animated-number"><span aria-hidden="true">{format(display, digits)}</span><span className="sr-only">{format(value, digits)}</span></span>;
}

import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — counts up to `value` on mount (and on change).
 * Respects prefers-reduced-motion by snapping to the final value.
 */
export function AnimatedCounter({ value = 0, duration = 900, format = (n) => n.toLocaleString(), className }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const target = Number(value) || 0;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(target); return; }

    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}

export default AnimatedCounter;

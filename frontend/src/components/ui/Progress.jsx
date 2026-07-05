import { cn } from '@/lib/utils';

/**
 * Progress — gradient-filled bar. `value` is 0–100.
 */
export function Progress({ value = 0, className, barClassName }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-spring', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default Progress;

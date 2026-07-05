import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Spinner — for the rare cases a skeleton doesn't fit (button/inline waits). */
export function Spinner({ className, size = 20 }) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} style={{ width: size, height: size }} />;
}

/** Full-area centered loader with optional label. */
export function LoaderPanel({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient shadow-glow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </span>
      </div>
      {label && <p className="mt-4 text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

export default Spinner;

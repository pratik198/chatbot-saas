import { cn } from '@/lib/utils';

/** Skeleton — shimmer placeholder. Compose several to mirror real layout. */
export function Skeleton({ className, ...props }) {
  return <div className={cn('shimmer rounded-lg bg-muted/60', className)} {...props} />;
}

export default Skeleton;

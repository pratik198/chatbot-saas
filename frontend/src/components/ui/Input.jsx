import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Input — themed text field. `error` renders the destructive ring.
 * For icon/adornment layouts, wrap in a relative container and add padding.
 */
const Input = forwardRef(function Input({ className, type = 'text', error = false, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground shadow-soft',
        'transition-all duration-200 placeholder:text-muted-foreground',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        error ? 'border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive' : 'border-input',
        className,
      )}
      {...props}
    />
  );
});

export { Input };
export default Input;

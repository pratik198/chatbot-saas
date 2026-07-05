/**
 * Button — the workhorse primitive (shadcn-style, cva variants).
 *
 * variants: default (gradient), secondary, outline, ghost, destructive, link
 * sizes:    sm, default, lg, icon
 * extras:   `loading` shows a spinner + disables; `asChild` renders a child
 *           element (e.g. <Link>) with the button styling via Radix Slot.
 */
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ' +
    'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_svg]:shrink-0 [&_svg]:size-4 select-none',
  {
    variants: {
      variant: {
        default:
          'text-primary-foreground bg-brand-gradient shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'bg-secondary text-secondary-foreground border border-border shadow-soft hover:bg-secondary/70 hover:-translate-y-0.5',
        outline:
          'border border-border bg-card text-foreground shadow-soft hover:bg-secondary hover:-translate-y-0.5',
        ghost: 'text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:brightness-110 hover:-translate-y-0.5',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px] rounded-lg',
        default: 'h-10 px-5 py-2',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  // asChild → render via Radix Slot, which requires EXACTLY ONE child element.
  // So we must NOT inject a sibling (e.g. the loading spinner) here — pass the
  // single child straight through. Loading state only applies to real buttons.
  if (asChild) {
    return (
      <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
});

export { Button };
export default Button;

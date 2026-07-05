/**
 * Card family — surface primitives.
 *
 * <Card> is the base surface. Pass `hover` for the lift-on-hover interaction
 * and `gradient` for the subtle gradient hairline border used on feature cards.
 */
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef(function Card({ className, hover = false, gradient = false, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-card',
        hover && 'transition-all duration-300 hover:shadow-elevated hover:-translate-y-1',
        gradient && 'gradient-border',
        className,
      )}
      {...props}
    />
  );
});

const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
});

const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return (
    <h3 ref={ref} className={cn('text-base font-semibold leading-tight tracking-tight', className)} {...props} />
  );
});

const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
});

const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
});

const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

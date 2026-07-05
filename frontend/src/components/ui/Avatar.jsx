import { forwardRef } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
});

const AvatarImage = forwardRef(function AvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />;
});

const AvatarFallback = forwardRef(function AvatarFallback({ className, style, children, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn('flex h-full w-full items-center justify-center text-xs font-semibold text-white', className)}
      style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #a855f7)', ...style }}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
});

export { Avatar, AvatarImage, AvatarFallback };

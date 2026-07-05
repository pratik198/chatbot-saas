import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * Toaster — Sonner, wired to our theme and design tokens. Mounted once at the
 * app root. Call toast() from anywhere: import { toast } from 'sonner'.
 */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-border bg-popover text-popover-foreground shadow-elevated',
          description: 'text-muted-foreground',
          actionButton: 'bg-brand-gradient text-white rounded-lg',
          cancelButton: 'bg-secondary text-secondary-foreground rounded-lg',
        },
      }}
    />
  );
}

export default Toaster;

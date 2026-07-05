import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * EmptyState — never show a blank page. A soft gradient icon halo, a clear
 * message, and (optionally) a call to action.
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export default EmptyState;

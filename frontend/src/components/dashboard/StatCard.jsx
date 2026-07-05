import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { staggerItem } from '@/components/ui/PageTransition';
import { cn } from '@/lib/utils';

const TONES = {
  indigo: { grad: 'from-indigo-500 to-violet-500', soft: 'bg-indigo-500/10 text-indigo-500' },
  blue: { grad: 'from-sky-500 to-blue-600', soft: 'bg-sky-500/10 text-sky-500' },
  green: { grad: 'from-emerald-500 to-teal-500', soft: 'bg-emerald-500/10 text-emerald-500' },
  amber: { grad: 'from-amber-500 to-orange-500', soft: 'bg-amber-500/10 text-amber-500' },
  pink: { grad: 'from-pink-500 to-rose-500', soft: 'bg-pink-500/10 text-pink-500' },
};

/**
 * StatCard — animated KPI tile. Real value counts up; optional trend chip and
 * link. Hover lifts + reveals a gradient glow. Used across Dashboard/Analytics.
 */
export function StatCard({ icon: Icon, label, value, hint, tone = 'indigo', to, loading = false, delta }) {
  const t = TONES[tone] || TONES.indigo;

  const inner = (
    <Card hover className="group relative overflow-hidden p-5">
      {/* corner glow */}
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30', t.grad)} />
      <div className="flex items-center justify-between">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', t.soft)}>
          <Icon className="h-5 w-5" />
        </div>
        {delta != null && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold', delta >= 0 ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive')}>
            <ArrowUpRight className={cn('h-3 w-3', delta < 0 && 'rotate-90')} />
            {Math.abs(delta)}%
          </span>
        )}
        {to && delta == null && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-9 w-16 rounded-lg bg-muted/60 shimmer" />
        ) : (
          <p className="text-3xl font-bold tracking-tight text-foreground">
            <AnimatedCounter value={value} />
          </p>
        )}
        <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
      </div>
    </Card>
  );

  return (
    <motion.div variants={staggerItem}>
      {to ? <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">{inner}</Link> : inner}
    </motion.div>
  );
}

export default StatCard;

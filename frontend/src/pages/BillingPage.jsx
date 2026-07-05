/**
 * BillingPage — plan, usage, and upgrade options (UI only; no Stripe yet).
 * Usage pulls real totals from getOverview(); restyled with the design system.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Zap, Check, Bot, MessageSquare, Users, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOverview } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/mo', current: true, popular: false,
    features: ['3 chatbots', '500 conversations/mo', '100 leads/mo', 'Lumina AI engine', 'Basic analytics', 'Community support'],
    limits: { chatbots: 3, conversations: 500, leads: 100 },
  },
  {
    name: 'Pro', price: '$29', period: '/mo', current: false, popular: true,
    features: ['20 chatbots', '10,000 conversations/mo', 'Unlimited leads', 'Advanced analytics', 'Priority support', 'Custom branding', 'API access'],
    limits: { chatbots: 20, conversations: 10000, leads: -1 },
  },
  {
    name: 'Business', price: '$99', period: '/mo', current: false, popular: false,
    features: ['Unlimited chatbots', 'Unlimited conversations', 'Unlimited leads', 'White-label option', 'Dedicated support', 'SLA guarantee', 'Team members'],
    limits: { chatbots: -1, conversations: -1, leads: -1 },
  },
];

export default function BillingPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview().then(setOverview).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const free = PLANS[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Billing & plans</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">You're on the <span className="font-semibold text-primary">Free plan</span>. Upgrade to unlock more.</p>
      </div>

      {/* usage */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Current usage · Free plan</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</>
          ) : (
            <>
              <UsageBar icon={Bot} label="Chatbots" used={overview?.totalChatbots ?? 0} limit={free.limits.chatbots} />
              <UsageBar icon={MessageSquare} label="Conversations" used={overview?.totalConversations ?? 0} limit={free.limits.conversations} />
              <UsageBar icon={Users} label="Leads" used={overview?.totalLeads ?? 0} limit={free.limits.leads} />
            </>
          )}
        </CardContent>
      </Card>

      {/* plans */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name} hover={!plan.current}
            className={cn('relative flex flex-col p-6', plan.popular && 'border-primary/40 shadow-glow', plan.current && 'ring-1 ring-primary/20')}>
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white shadow-glow-sm">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            <div className="mb-5 mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mb-6 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15"><Check className="h-3 w-3 text-success" /></span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <Button variant="secondary" disabled className="w-full">Current plan</Button>
            ) : (
              <Button variant={plan.popular ? 'default' : 'outline'} className="w-full"
                onClick={() => toast('Stripe billing is coming soon', { description: `${plan.name} · ${plan.price}${plan.period}` })}>
                {plan.popular && <Sparkles className="h-4 w-4" />} Upgrade to {plan.name}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">All plans include the embeddable widget, lead capture, and agent handoff. Stripe billing arrives in a future update.</p>
    </div>
  );
}

function UsageBar({ icon: Icon, label, used, limit }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = pct >= 80 && pct < 100;
  const over = pct >= 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
        <span className={cn('text-xs font-medium', over ? 'text-destructive' : warn ? 'text-warning' : 'text-muted-foreground')}>
          {used} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      <Progress value={limit === -1 ? 6 : pct} barClassName={cn(over && 'bg-destructive', warn && 'bg-gradient-to-r from-amber-500 to-orange-500')} />
    </div>
  );
}

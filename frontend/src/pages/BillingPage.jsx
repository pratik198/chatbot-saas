/**
 * WHY this page exists:
 *   Shows the current plan, usage limits, and upgrade options.
 *   Phase 9 UI — no real Stripe integration yet, but shows what billing would look like.
 *   When ready to monetize, wire up Stripe Checkout and replace the upgrade buttons.
 */

import { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle, Bot, MessageSquare, Users, Loader2 } from 'lucide-react';
import { getOverview } from '@/lib/analytics';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    current: true,
    color: 'border-brand-500 bg-brand-50',
    features: [
      '3 chatbots',
      '500 conversations/month',
      '100 leads/month',
      'Ollama (local AI, free)',
      'Basic analytics',
      'Community support',
    ],
    limits: { chatbots: 3, conversations: 500, leads: 100 },
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    current: false,
    color: 'border-gray-200',
    features: [
      '20 chatbots',
      '10,000 conversations/month',
      'Unlimited leads',
      'Ollama + OpenAI support',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'API access',
    ],
    limits: { chatbots: 20, conversations: 10000, leads: -1 },
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    current: false,
    color: 'border-gray-200',
    features: [
      'Unlimited chatbots',
      'Unlimited conversations',
      'Unlimited leads',
      'All AI providers',
      'White-label option',
      'Dedicated support',
      'SLA guarantee',
      'Team members',
    ],
    limits: { chatbots: -1, conversations: -1, leads: -1 },
  },
];

export default function BillingPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview().then(setOverview).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const freePlan = PLANS[0];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
      <p className="text-sm text-gray-500 mb-8">
        You are on the <span className="font-semibold text-brand-600">Free plan</span>.
        Upgrade to unlock more chatbots, conversations, and features.
      </p>

      {/* ── Current Usage ────────────────────────────────────────────────── */}
      <div className="card p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-500" />
          Current Usage — Free Plan
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading usage...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <UsageBar
              icon={Bot}
              label="Chatbots"
              used={overview?.totalChatbots ?? 0}
              limit={freePlan.limits.chatbots}
            />
            <UsageBar
              icon={MessageSquare}
              label="Conversations"
              used={overview?.totalConversations ?? 0}
              limit={freePlan.limits.conversations}
            />
            <UsageBar
              icon={Users}
              label="Leads"
              used={overview?.totalLeads ?? 0}
              limit={freePlan.limits.leads}
            />
          </div>
        )}
      </div>

      {/* ── Plan Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div
            key={plan.name}
            className={`card p-6 border-2 relative ${plan.color} ${plan.current ? 'shadow-md' : ''}`}
          >
            {plan.current && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white
                               text-xs font-bold px-3 py-1 rounded-full">
                Current Plan
              </span>
            )}

            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-4">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-sm text-gray-400">{plan.period}</span>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.current ? (
              <button disabled className="w-full py-2.5 rounded-xl bg-brand-100 text-brand-700 text-sm font-medium">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => alert(`Stripe integration coming soon! ${plan.name} plan at ${plan.price}/mo.`)}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
              >
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        All plans include the embeddable widget, lead capture, and agent handoff.
        Stripe billing will be enabled in a future update.
      </p>
    </div>
  );
}

function UsageBar({ icon: Icon, label, used, limit }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isWarning = pct >= 80;
  const isOver = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{label}</span>
        </div>
        <span className={`text-xs font-medium ${isOver ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-500'}`}>
          {used} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-brand-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * WHY this page exists:
 *   Gives the chatbot owner a high-level view of their performance:
 *   how many conversations happened, how many leads were captured, etc.
 *   Uses CSS-based bar charts (no extra charting library needed).
 *
 * WHAT it shows:
 *   - 4 stat cards: chatbots, conversations, leads, unread leads
 *   - Per-chatbot performance table with visual bar indicators
 */

import { useState, useEffect } from 'react';
import { Bot, MessageSquare, Users, Inbox, TrendingUp, Globe, Loader2 } from 'lucide-react';
import { getOverview, getChatbotStats } from '@/lib/analytics';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [chatbotStats, setChatbotStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [ov, stats] = await Promise.all([getOverview(), getChatbotStats()]);
        setOverview(ov);
        setChatbotStats(stats);
      } catch {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin text-brand-500 mr-2" />
      <span className="text-gray-500">Loading analytics...</span>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
  );

  // Find max conversations for % bar width calculation
  const maxConversations = Math.max(...chatbotStats.map(s => s.conversations), 1);
  const maxLeads = Math.max(...chatbotStats.map(s => s.leads), 1);

  return (
    <div>
      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Performance overview for all your chatbots</p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Bot}
          label="Total Chatbots"
          value={overview?.totalChatbots ?? 0}
          color="brand"
          description="All time"
        />
        <StatCard
          icon={MessageSquare}
          label="Conversations"
          value={overview?.totalConversations ?? 0}
          color="blue"
          description="All time"
        />
        <StatCard
          icon={Users}
          label="Leads Captured"
          value={overview?.totalLeads ?? 0}
          color="green"
          description="All time"
        />
        <StatCard
          icon={Inbox}
          label="Unread Leads"
          value={overview?.unreadLeads ?? 0}
          color="orange"
          description="Needs attention"
        />
      </div>

      {/* ── Per-Chatbot Performance ──────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-900">Chatbot Performance</h2>
        </div>

        {chatbotStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No chatbots yet. Create one to see stats here.
          </p>
        ) : (
          <div className="space-y-6">
            {chatbotStats.map(stat => (
              <div key={stat.chatbotId}>
                {/* Chatbot name + status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stat.themeColor || '#2563eb' }}
                    />
                    <span className="text-sm font-medium text-gray-800">{stat.chatbotName}</span>
                    {stat.isPublished ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                        <Globe className="w-3 h-3" /> Live
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Draft</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{stat.conversations} conversations</span>
                    <span>{stat.leads} leads</span>
                  </div>
                </div>

                {/* Conversations bar */}
                <div className="mb-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Conversations</span>
                    <span>{stat.conversations}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round((stat.conversations / maxConversations) * 100)}%`,
                        backgroundColor: stat.themeColor || '#2563eb',
                      }}
                    />
                  </div>
                </div>

                {/* Leads bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Leads</span>
                    <span>{stat.leads}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((stat.leads / maxLeads) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Conversion Insight ──────────────────────────────────────────── */}
      {overview?.totalConversations > 0 && (
        <div className="mt-4 card p-4 bg-brand-50 border-brand-100">
          <p className="text-sm text-brand-700">
            <span className="font-semibold">Lead conversion rate: </span>
            {((overview.totalLeads / overview.totalConversations) * 100).toFixed(1)}%
            {' '}— {overview.totalLeads} leads from {overview.totalConversations} conversations.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, description }) {
  const colors = {
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-600',  val: 'text-brand-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   val: 'text-blue-700'   },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  val: 'text-green-700'  },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', val: 'text-orange-700' },
  };
  const c = colors[color];

  return (
    <div className="card p-5">
      <div className={`inline-flex w-10 h-10 rounded-xl ${c.bg} items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
    </div>
  );
}

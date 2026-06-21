/**
 * WHY this page exists:
 *   The dashboard is the first thing a user sees after logging in.
 *   Shows stat cards, getting started checklist, and recent activity.
 *
 * HOW it differs from Next.js version:
 *   - Link from react-router-dom (to="/chatbots" instead of href="/chatbots")
 *   - No 'use client' directive needed (Vite React is always client-side)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquare, Users, TrendingUp, ArrowUpRight, Plus, BookOpen, Zap } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { getOverview } from '@/lib/analytics';

const buildGettingStarted = (overview) => [
  {
    step: '1', title: 'Create your first chatbot',
    description: 'Set up a chatbot with a name, welcome message, and personality.',
    to: '/chatbots', icon: Bot, done: (overview?.totalChatbots ?? 0) > 0,
  },
  {
    step: '2', title: 'Add knowledge base',
    description: 'Upload PDFs or add FAQs to make your chatbot knowledgeable.',
    to: '/knowledge', icon: BookOpen, done: false,
  },
  {
    step: '3', title: 'Deploy to your website',
    description: 'Copy the embed script from Settings and paste it on your website.',
    to: '/settings', icon: Zap, done: false,
  },
];

const buildStats = (overview) => [
  { label: 'Total Chatbots',      value: String(overview?.totalChatbots     ?? '…'), change: 'manage in Chatbots',   icon: Bot,          color: 'bg-blue-50',   iconColor: 'text-blue-600',   to: '/chatbots' },
  { label: 'Total Conversations', value: String(overview?.totalConversations ?? '…'), change: 'view all chats',       icon: MessageSquare, color: 'bg-green-50',  iconColor: 'text-green-600',  to: '/conversations' },
  { label: 'Total Leads',         value: String(overview?.totalLeads         ?? '…'), change: `${overview?.unreadLeads ?? 0} unread`,       icon: Users,         color: 'bg-purple-50', iconColor: 'text-purple-600', to: '/leads' },
  { label: 'Analytics',           value: '→',                                          change: 'view full breakdown',  icon: TrendingUp,    color: 'bg-orange-50', iconColor: 'text-orange-600', to: '/analytics' },
];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    setUser(getUser());
    getOverview().then(setOverview).catch(() => setOverview({ totalChatbots: 0, totalConversations: 0, totalLeads: 0, unreadLeads: 0 }));
  }, []);

  const stats = buildStats(overview);
  const greeting = getGreeting();

  return (
    <div className="space-y-6">

      {/* ── Welcome Header ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.firstName || 'there'} 👋
          </h2>
          <p className="text-gray-500 mt-1">Here's what's happening with your chatbots today.</p>
        </div>
        <Link to="/chatbots" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Chatbot
        </Link>
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.to} className="card p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Getting Started — 2/3 width */}
        <div className="lg:col-span-2 card p-6">
          {(() => {
            const gettingStarted = buildGettingStarted(overview);
            const doneCount = gettingStarted.filter(i => i.done).length;
            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Getting Started</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {doneCount} / {gettingStarted.length} complete
                  </span>
                </div>
                <div className="space-y-4">
                  {gettingStarted.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.step} to={item.to}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                          item.done
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          item.done ? 'bg-green-500 text-white' : 'bg-brand-100 text-brand-700'
                        }`}>
                          {item.done ? '✓' : item.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-500" />
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      </Link>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Activity — 1/3 width */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No activity yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Activity will appear here once you create and deploy a chatbot.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

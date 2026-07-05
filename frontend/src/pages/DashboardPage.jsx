/**
 * DashboardPage — the post-login home.
 *
 * Data is 100% real (no fabricated metrics):
 *   getOverview()      → KPI totals
 *   getChatbotStats()  → per-chatbot conversations/leads (charts)
 *   getAllLeads()      → recent activity feed
 * Empty/loading/error states are all handled.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Bot, MessageSquare, Users, Inbox, Plus, BookOpen, Zap, ArrowUpRight,
  Sparkles, BarChart3, CheckCircle2, Rocket, PieChart as PieIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { staggerContainer } from '@/components/ui/PageTransition';
import { useChartColors, ChartTooltip, SERIES } from '@/components/charts/ChartKit';
import { getUser } from '@/lib/auth';
import { getOverview, getChatbotStats } from '@/lib/analytics';
import { getAllLeads } from '@/lib/leads';
import { initials, timeAgo, cn } from '@/lib/utils';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const colors = useChartColors();

  useEffect(() => {
    setUser(getUser());
    Promise.allSettled([getOverview(), getChatbotStats(), getAllLeads()]).then(([ov, st, ld]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      else setOverview({ totalChatbots: 0, totalConversations: 0, totalLeads: 0, unreadLeads: 0 });
      if (st.status === 'fulfilled') setStats(st.value || []);
      if (ld.status === 'fulfilled') setLeads(ld.value || []);
      setLoading(false);
    });
  }, []);

  const chartData = stats.map((s) => ({
    name: s.chatbotName?.length > 12 ? s.chatbotName.slice(0, 11) + '…' : s.chatbotName,
    Conversations: s.conversations || 0,
    Leads: s.leads || 0,
  }));
  const leadPie = stats.filter((s) => (s.leads || 0) > 0).map((s) => ({ name: s.chatbotName, value: s.leads }));
  const recentLeads = [...leads].slice(0, 6);

  const steps = [
    { title: 'Create your first chatbot', desc: 'Name it, set a welcome message and personality.', to: '/chatbots/new', icon: Bot, done: (overview?.totalChatbots ?? 0) > 0 },
    { title: 'Add knowledge', desc: 'Upload PDFs or FAQs so it answers accurately.', to: '/knowledge', icon: BookOpen, done: false },
    { title: 'Deploy to your site', desc: 'Copy the embed snippet and go live.', to: '/settings', icon: Rocket, done: false },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-brand-gradient p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light">
          <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full bg-white/30 blur-3xl animate-aurora" />
          <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl animate-aurora [animation-delay:-8s]" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-3 border-white/20 bg-white/15 text-white backdrop-blur">
              <Sparkles className="h-3 w-3" /> {getGreeting()}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user?.firstName || 'there'} 👋
            </h2>
            <p className="mt-1.5 max-w-lg text-white/80">
              Here's a snapshot of your workspace. Ship a smarter assistant today.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="border-transparent bg-white text-indigo-600 hover:bg-white/90">
              <Link to="/chatbots/new"><Plus className="h-4 w-4" /> New Chatbot</Link>
            </Button>
            <Button asChild className="bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
              <Link to="/knowledge"><BookOpen className="h-4 w-4" /> Upload Knowledge</Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI cards ────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer} initial="hidden" animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard icon={Bot} tone="indigo" label="Total Chatbots" value={overview?.totalChatbots ?? 0} hint="Across your workspace" to="/chatbots" loading={loading} />
        <StatCard icon={MessageSquare} tone="blue" label="Conversations" value={overview?.totalConversations ?? 0} hint="All time" to="/conversations" loading={loading} />
        <StatCard icon={Users} tone="green" label="Leads Captured" value={overview?.totalLeads ?? 0} hint="From your bots" to="/leads" loading={loading} />
        <StatCard icon={Inbox} tone="amber" label="Unread Leads" value={overview?.unreadLeads ?? 0} hint="Needs attention" to="/leads" loading={loading} />
      </motion.div>

      {/* ── Charts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Engagement by chatbot</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Conversations and leads per assistant</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/analytics">View all <ArrowUpRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState icon={BarChart3} title="No data yet" description="Once your chatbots start chatting, engagement shows up here." className="py-10" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: colors.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                    <RTooltip content={<ChartTooltip />} cursor={{ stroke: colors.grid }} />
                    <Area type="monotone" dataKey="Conversations" stroke="#6366f1" strokeWidth={2.5} fill="url(#gConv)" />
                    <Area type="monotone" dataKey="Leads" stroke="#a855f7" strokeWidth={2.5} fill="url(#gLead)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieIcon className="h-4 w-4 text-primary" /> Leads by chatbot</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Share of captured leads</p>
          </CardHeader>
          <CardContent>
            {leadPie.length === 0 ? (
              <EmptyState icon={Users} title="No leads yet" description="Publish a bot with the lead form enabled." className="py-8" />
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                        {leadPie.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {leadPie.slice(0, 4).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES[i % SERIES.length] }} />
                      <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent leads + Getting started ───────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent leads</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/leads">View all <ArrowUpRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <EmptyState icon={Users} title="No activity yet" description="Leads captured by your chatbots will appear here in real time." className="py-8"
                action={<Button asChild size="sm"><Link to="/chatbots/new"><Plus className="h-4 w-4" /> Create a chatbot</Link></Button>} />
            ) : (
              <ul className="divide-y divide-border">
                {recentLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link to="/leads" className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundImage: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                        {initials(lead.visitorName || lead.visitorEmail || '?')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{lead.visitorName || 'Anonymous visitor'}</p>
                        <p className="truncate text-xs text-muted-foreground">{lead.visitorEmail}</p>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        {lead.chatbotName && <Badge variant="secondary">{lead.chatbotName}</Badge>}
                        {!lead.read && <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(lead.capturedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Getting started</CardTitle>
            <Badge variant={doneCount === steps.length ? 'success' : 'secondary'}>{doneCount}/{steps.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.title} to={s.to}
                  className={cn('group flex items-start gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5',
                    s.done ? 'border-success/30 bg-success/5' : 'border-border hover:border-primary/30 hover:bg-secondary')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    s.done ? 'bg-success text-white' : 'bg-primary/10 text-primary')}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button asChild variant="outline" size="sm"><Link to="/analytics"><BarChart3 className="h-4 w-4" /> Analytics</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/settings"><Zap className="h-4 w-4" /> Deploy</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

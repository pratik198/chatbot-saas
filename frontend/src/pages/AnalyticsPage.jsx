/**
 * AnalyticsPage — performance overview.
 * Data unchanged (getOverview + getChatbotStats); rebuilt with Recharts
 * (bar + donut), animated KPIs, per-chatbot breakdown, and a conversion insight.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Bot, MessageSquare, Users, Inbox, TrendingUp, Globe, BarChart3, PieChart as PieIcon, Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { staggerContainer } from '@/components/ui/PageTransition';
import { useChartColors, ChartTooltip, SERIES } from '@/components/charts/ChartKit';
import { getOverview, getChatbotStats } from '@/lib/analytics';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const colors = useChartColors();

  useEffect(() => {
    (async () => {
      try {
        const [ov, st] = await Promise.all([getOverview(), getChatbotStats()]);
        setOverview(ov); setStats(st || []);
      } catch { setError('Failed to load analytics.'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</Card>;
  }

  const barData = stats.map((s) => ({
    name: s.chatbotName?.length > 12 ? s.chatbotName.slice(0, 11) + '…' : s.chatbotName,
    Conversations: s.conversations || 0, Leads: s.leads || 0,
  }));
  const convPie = stats.filter((s) => (s.conversations || 0) > 0).map((s) => ({ name: s.chatbotName, value: s.conversations }));
  const maxConv = Math.max(...stats.map((s) => s.conversations || 0), 1);
  const maxLeads = Math.max(...stats.map((s) => s.leads || 0), 1);
  const conversion = overview?.totalConversations > 0 ? ((overview.totalLeads / overview.totalConversations) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bot} tone="indigo" label="Total Chatbots" value={overview?.totalChatbots ?? 0} hint="All time" />
        <StatCard icon={MessageSquare} tone="blue" label="Conversations" value={overview?.totalConversations ?? 0} hint="All time" />
        <StatCard icon={Users} tone="green" label="Leads Captured" value={overview?.totalLeads ?? 0} hint="All time" />
        <StatCard icon={Inbox} tone="amber" label="Unread Leads" value={overview?.unreadLeads ?? 0} hint="Needs attention" />
      </motion.div>

      {conversion && (
        <Card gradient className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Lead conversion rate</p>
              <p className="text-2xl font-bold text-foreground">{conversion}%</p>
            </div>
            <p className="ml-auto max-w-xs text-sm text-muted-foreground">
              {overview.totalLeads} lead{overview.totalLeads === 1 ? '' : 's'} from {overview.totalConversations} conversation{overview.totalConversations === 1 ? '' : 's'}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Conversations vs leads</CardTitle></CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <EmptyState icon={BarChart3} title="No data yet" description="Create and publish a chatbot to see performance." className="py-10" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: colors.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                    <RTooltip content={<ChartTooltip />} cursor={{ fill: colors.cursor }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="Conversations" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Leads" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieIcon className="h-4 w-4 text-primary" /> Conversation share</CardTitle></CardHeader>
          <CardContent>
            {convPie.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No conversations yet" className="py-8" />
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={convPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                        {convPie.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {convPie.slice(0, 5).map((d, i) => (
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

      {/* per-chatbot breakdown */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Chatbot performance</CardTitle></CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <EmptyState icon={Bot} title="No chatbots yet" description="Create one to see per-chatbot metrics here."
              action={<Button asChild size="sm"><Link to="/chatbots/new">Create a chatbot</Link></Button>} />
          ) : (
            <div className="space-y-6">
              {stats.map((s) => (
                <div key={s.chatbotId}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.themeColor || '#6366f1' }} />
                    <span className="text-sm font-medium text-foreground">{s.chatbotName}</span>
                    {s.isPublished ? <Badge variant="success" dot>Live</Badge> : <Badge variant="secondary">Draft</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{s.conversations} conversations · {s.leads} leads</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Conversations</span><span>{s.conversations}</span></div>
                      <Progress value={Math.round(((s.conversations || 0) / maxConv) * 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Leads</span><span>{s.leads}</span></div>
                      <Progress value={Math.round(((s.leads || 0) / maxLeads) * 100)} className="h-2" barClassName="bg-gradient-to-r from-emerald-500 to-teal-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

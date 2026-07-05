/**
 * LeadsPage — leads captured by chatbots, master/detail.
 * Logic unchanged (getAllLeads, markLeadAsRead, markAllLeadsAsRead); restyled.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Mail, Phone, MessageSquare, Bot, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderPanel } from '@/components/ui/Spinner';
import { getAllLeads, markLeadAsRead, markAllLeadsAsRead } from '@/lib/leads';
import { cn, initials, timeAgo } from '@/lib/utils';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterBot, setFilterBot] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLeads(await getAllLeads()); }
    catch { toast.error('Failed to load leads.'); }
    finally { setLoading(false); }
  }

  async function handleSelect(lead) {
    setSelected(lead);
    if (!lead.read) {
      try { await markLeadAsRead(lead.id); setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, read: true } : l)); }
      catch { /* silent */ }
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllLeadsAsRead();
      setLeads((prev) => prev.map((l) => ({ ...l, read: true })));
      if (selected) setSelected((prev) => ({ ...prev, read: true }));
      toast.success('All leads marked as read');
    } catch { toast.error('Failed to mark all as read.'); }
    finally { setMarkingAll(false); }
  }

  const chatbotNames = [...new Set(leads.map((l) => l.chatbotName).filter(Boolean))];
  const filtered = filterBot === 'all' ? leads : leads.filter((l) => l.chatbotName === filterBot);
  const unreadCount = leads.filter((l) => !l.read).length;

  const fmt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <LoaderPanel label="Loading leads…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Leads</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{leads.length} total · {unreadCount} unread</p>
        </div>
        {leads.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={filterBot} onChange={(e) => setFilterBot(e.target.value)}
              className="h-10 appearance-none rounded-xl border border-input bg-card px-3.5 pr-8 text-sm text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <option value="all">All chatbots</option>
              {chatbotNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {unreadCount > 0 && <Button variant="outline" onClick={handleMarkAllRead} loading={markingAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
          </div>
        )}
      </div>

      {leads.length === 0 ? (
        <Card className="py-4">
          <EmptyState icon={Users} title="No leads yet"
            description="Enable the lead form on a chatbot, publish it, and embed it on your site. Captured leads appear here."
            action={<Button asChild><Link to="/chatbots">Go to chatbots</Link></Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* list */}
          <Card className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
            <ul className="space-y-1">
              {filtered.map((lead) => (
                <li key={lead.id}>
                  <button onClick={() => handleSelect(lead)}
                    className={cn('flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors',
                      selected?.id === lead.id ? 'bg-primary/10 ring-1 ring-primary/15' : 'hover:bg-secondary')}>
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundImage: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                      {initials(lead.visitorName || lead.visitorEmail || '?')}
                      {!lead.read && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[hsl(var(--card))]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', !lead.read ? 'font-semibold text-foreground' : 'text-foreground/90')}>{lead.visitorName || 'Anonymous'}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.visitorEmail}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {lead.chatbotName && <Badge variant="secondary" className="text-2xs">{lead.chatbotName}</Badge>}
                        <span className="text-2xs text-muted-foreground">{timeAgo(lead.capturedAt)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* detail */}
          <Card className="p-6">
            {!selected ? (
              <EmptyState icon={Users} title="Select a lead" description="Pick a lead from the list to see full details." className="py-16" />
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundImage: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                      {initials(selected.visitorName || selected.visitorEmail || '?')}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selected.visitorName || 'Anonymous visitor'}</h3>
                      <Badge variant={selected.source === 'WIDGET' ? 'default' : 'secondary'}>{selected.source === 'WIDGET' ? 'Website widget' : 'Dashboard test'}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmt(selected.capturedAt)}</span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info icon={Mail} label="Email" value={selected.visitorEmail} />
                  <Info icon={Phone} label="Phone" value={selected.visitorPhone || '—'} />
                  <Info icon={Bot} label="Chatbot" value={selected.chatbotName} />
                  {selected.conversationId && <Info icon={MessageSquare} label="Conversation" value={`#${selected.conversationId}`} />}
                </div>

                {selected.initialMessage && (
                  <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Initial message</p>
                    <p className="text-sm text-foreground">{selected.initialMessage}</p>
                  </div>
                )}

                <div className="mt-6">
                  <Button asChild><a href={`mailto:${selected.visitorEmail}`}><Mail className="h-4 w-4" /> Send email</a></Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

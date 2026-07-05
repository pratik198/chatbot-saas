/**
 * AgentPage — live handoff inbox. Logic unchanged (5s polling of getHandoffs,
 * getHandoff, accept, reply, close). Restyled two-pane; toasts + styled confirm.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Headphones, Clock, CheckCircle2, XCircle, Send, User, Bot, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderPanel } from '@/components/ui/Spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import { getHandoffs, getHandoff, acceptHandoff, agentReply, closeHandoff } from '@/lib/handoff';
import { cn, initials, timeAgo } from '@/lib/utils';

const STATUS = {
  PENDING: { variant: 'warning', icon: Clock },
  ACTIVE: { variant: 'success', icon: CheckCircle2 },
  CLOSED: { variant: 'secondary', icon: XCircle },
};

export default function AgentPage() {
  const [handoffs, setHandoffs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const pollingRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.messages]);

  const loadHandoffs = useCallback(async () => {
    try { setHandoffs(await getHandoffs()); } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadHandoffs();
    pollingRef.current = setInterval(loadHandoffs, 5000);
    return () => clearInterval(pollingRef.current);
  }, [loadHandoffs]);

  useEffect(() => {
    if (selectedId) getHandoff(selectedId).then(setSelected).catch(() => {});
  }, [handoffs, selectedId]);

  async function handleSelect(h) {
    setSelectedId(h.id);
    try { setSelected(await getHandoff(h.id)); } catch { toast.error('Failed to load handoff.'); }
  }

  async function handleAccept() {
    if (!selected) return;
    try {
      const updated = await acceptHandoff(selected.id);
      setSelected((prev) => ({ ...prev, ...updated }));
      setHandoffs((prev) => prev.map((h) => h.id === selected.id ? { ...h, ...updated } : h));
      toast.success('Handoff accepted');
    } catch { toast.error('Failed to accept handoff.'); }
  }

  async function handleReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const msg = await agentReply(selected.id, replyText.trim());
      setSelected((prev) => ({ ...prev, messages: [...(prev.messages || []), msg] }));
      setReplyText('');
    } catch { toast.error('Failed to send reply.'); }
    finally { setSending(false); }
  }

  async function doClose() {
    setConfirmClose(false);
    if (!selected) return;
    try {
      await closeHandoff(selected.id);
      setHandoffs((prev) => prev.map((h) => h.id === selected.id ? { ...h, status: 'CLOSED' } : h));
      setSelected((prev) => ({ ...prev, status: 'CLOSED' }));
      toast.success('Handoff closed');
    } catch { toast.error('Failed to close.'); }
  }

  if (loading) return <LoaderPanel label="Loading agent inbox…" />;

  const pendingCount = handoffs.filter((h) => h.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Agent inbox</h2>
          {pendingCount > 0 && <Badge variant="warning" dot>{pendingCount} pending</Badge>}
        </div>
        <Button variant="outline" onClick={loadHandoffs}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {handoffs.length === 0 ? (
        <Card className="py-4">
          <EmptyState icon={Headphones} title="No handoff requests"
            description={'When a visitor clicks "Talk to a human" in your widget, their request appears here (polling every 5s).'} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          {/* list */}
          <Card className="max-h-[calc(100vh-13rem)] overflow-y-auto p-2">
            <ul className="space-y-1">
              {handoffs.map((h) => (
                <li key={h.id}>
                  <button onClick={() => handleSelect(h)}
                    className={cn('flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors',
                      selectedId === h.id ? 'bg-primary/10 ring-1 ring-primary/15' : 'hover:bg-secondary')}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundImage: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                      {initials(h.visitorName || 'V')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{h.visitorName || 'Anonymous'}</p>
                        <Badge variant={STATUS[h.status]?.variant}>{h.status}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{h.visitorEmail || 'No email'}</p>
                      <p className="mt-0.5 text-2xs text-muted-foreground">{timeAgo(h.requestedAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* detail */}
          <Card className="flex max-h-[calc(100vh-13rem)] flex-col overflow-hidden p-0">
            {!selected ? (
              <EmptyState icon={Headphones} title="Select a handoff" description="Pick a request to view the conversation." className="flex-1 py-16" />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{selected.visitorName || 'Anonymous visitor'}</p>
                      <Badge variant={STATUS[selected.status]?.variant}>{selected.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selected.visitorEmail} · {timeAgo(selected.requestedAt)}</p>
                    {selected.reason && <p className="mt-1 text-xs italic text-muted-foreground">"{selected.reason}"</p>}
                  </div>
                  <div className="flex gap-2">
                    {selected.status === 'PENDING' && <Button size="sm" onClick={handleAccept}>Accept</Button>}
                    {selected.status === 'ACTIVE' && <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmClose(true)}>Close</Button>}
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {(!selected.messages || selected.messages.length === 0) ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">No messages in this conversation</p>
                  ) : selected.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={msg.id} className={cn('flex items-end gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', isUser ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}>
                          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </span>
                        <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                          isUser ? 'rounded-br-none bg-secondary text-foreground' : 'rounded-bl-none bg-brand-gradient text-white')}>
                          <p className="whitespace-pre-wrap [word-break:break-word]">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {selected.status === 'ACTIVE' && (
                  <div className="flex gap-2 border-t border-border p-3">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      placeholder="Type your reply as agent…"
                      className="h-10 flex-1 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                    <Button size="icon" onClick={handleReply} disabled={!replyText.trim() || sending}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {selected.status === 'PENDING' && (
                  <div className="border-t border-border p-3"><p className="text-center text-xs text-muted-foreground">Accept the handoff to reply to this visitor.</p></div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close this handoff?</DialogTitle>
            <DialogDescription>The session will be marked closed and the visitor can no longer reach an agent in this thread.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={doClose}>Close handoff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

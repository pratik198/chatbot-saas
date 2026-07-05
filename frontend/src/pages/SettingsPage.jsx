/**
 * SettingsPage — global account settings + embed snippet.
 * Logic unchanged (backend reachability check, chatbot list, copy embed code);
 * restyled, with a styled confirm for the danger zone.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Settings, CheckCircle2, XCircle, Copy, Check, Loader2, Bot, Code2, AlertTriangle, Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

export default function SettingsPage() {
  const user = getUser();
  const [backendOk, setBackendOk] = useState(null);
  const [chatbots, setChatbots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [copied, setCopied] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => {
    api.get('/api/chatbots').then((r) => {
      setBackendOk(true);
      setChatbots(r.data.data || []);
      if (r.data.data?.length > 0) setSelectedBotId(String(r.data.data[0].id));
    }).catch(() => setBackendOk(false));
  }, []);

  const embedCode = selectedBotId
    ? `<script src="${window.location.origin}/widget.js" data-chatbot-id="${selectedBotId}"></script>`
    : '← Select a chatbot above';

  const copyEmbed = () => {
    if (!selectedBotId) return;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed snippet copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedBot = chatbots.find((b) => String(b.id) === String(selectedBotId));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Account */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Account</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Plan" value={<Badge>Free</Badge>} />
        </CardContent>
      </Card>

      {/* Connection */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> AI engine</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 p-3.5">
            {backendOk === null && <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Checking connection…</span></>}
            {backendOk === true && <><CheckCircle2 className="h-5 w-5 text-success" /><span className="text-sm font-medium text-foreground">Backend connected & ready</span></>}
            {backendOk === false && <><XCircle className="h-5 w-5 text-destructive" /><span className="text-sm font-medium text-destructive">Backend unreachable</span></>}
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground"><Zap className="h-3.5 w-3.5 text-primary" /> Running locally? Set up Ollama (one-time):</p>
            <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
              <li>Download from <span className="font-mono">ollama.com/download</span></li>
              <li>Chat model: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">ollama pull llama3.2</code></li>
              <li>Embeddings: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">ollama pull nomic-embed-text</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" /> Embed on your website</CardTitle>
          <p className="text-sm text-muted-foreground">Paste this before <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code> — the chat bubble appears in the corner.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Select chatbot</Label>
            <select value={selectedBotId} onChange={(e) => setSelectedBotId(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {chatbots.length === 0 && <option value="">No chatbots yet</option>}
              {chatbots.map((b) => <option key={b.id} value={b.id}>{b.name} {b.isPublished ? '(Published)' : '(Draft — publish first)'}</option>)}
            </select>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4">
            <code className="block break-all pr-10 font-mono text-xs text-emerald-400">{embedCode}</code>
            <button onClick={copyEmbed} disabled={!selectedBotId}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-40">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {selectedBot && !selectedBot.isPublished && (
            <p className="flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" /> This chatbot isn't published yet — publish it first.</p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Deleting your account removes all chatbots, conversations, leads, and data. This cannot be undone.</p>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setDangerOpen(true)}>Delete my account</Button>
        </CardContent>
      </Card>

      <Dialog open={dangerOpen} onOpenChange={setDangerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>Account deletion isn't available yet — please contact support and we'll help you out.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

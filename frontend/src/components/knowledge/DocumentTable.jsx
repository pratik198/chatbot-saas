/**
 * DocumentTable — knowledge base documents with status, type, progress + actions.
 * Data/props unchanged; restyled to the design system with a bulk-import
 * progress bar and themed status badges.
 */
import {
  Trash2, RefreshCw, FileText, MessageSquare, AlignLeft, Clock, CheckCircle2, XCircle, ListPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

const SOURCE = {
  PDF: { icon: FileText, tone: 'bg-rose-500/12 text-rose-500' },
  FAQ: { icon: MessageSquare, tone: 'bg-sky-500/12 text-sky-500' },
  BULK_FAQ: { icon: ListPlus, tone: 'bg-violet-500/12 text-violet-500' },
  TEXT: { icon: AlignLeft, tone: 'bg-slate-500/12 text-slate-500' },
};

const STATUS = {
  READY: { label: 'Ready', icon: CheckCircle2, variant: 'success' },
  PROCESSING: { label: 'Processing', icon: Clock, variant: 'warning' },
  FAILED: { label: 'Failed', icon: XCircle, variant: 'destructive' },
};

export default function DocumentTable({ documents, onDelete, onRetrain }) {
  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a PDF, add an FAQ, or paste text above to start training this chatbot."
        className="py-12"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chunks</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Added</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {documents.map((doc) => {
            const src = SOURCE[doc.sourceType] || SOURCE.TEXT;
            const SourceIcon = src.icon;
            const st = STATUS[doc.status] || STATUS.PROCESSING;
            const StatusIcon = st.icon;
            const isBulk = doc.totalPairs != null;
            const pct = isBulk && doc.totalPairs > 0 ? Math.round(((doc.processedPairs || 0) / doc.totalPairs) * 100) : 0;

            return (
              <tr key={doc.id} className="group transition-colors hover:bg-secondary/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', src.tone)}>
                      <SourceIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[220px] truncate font-medium text-foreground">{doc.name}</p>
                      {doc.fileSize > 0 && <p className="text-xs text-muted-foreground">{formatSize(doc.fileSize)}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant="secondary">{(doc.sourceType || 'TEXT').replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={st.variant}>
                    <StatusIcon className={cn('h-3 w-3', doc.status === 'PROCESSING' && 'animate-spin')} />
                    {st.label}
                  </Badge>
                  {doc.status === 'FAILED' && doc.errorMessage && (
                    <p className="mt-1 max-w-[220px] truncate text-xs text-destructive" title={doc.errorMessage}>{doc.errorMessage}</p>
                  )}
                  {isBulk && doc.status === 'PROCESSING' && (
                    <div className="mt-1.5 w-36">
                      <Progress value={pct} className="h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(doc.processedPairs ?? 0).toLocaleString()} / {doc.totalPairs?.toLocaleString()}
                      </p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  {isBulk
                    ? (doc.status === 'READY' ? `${doc.chunkCount?.toLocaleString()} pairs${doc.skippedPairs > 0 ? ` (${doc.skippedPairs} skipped)` : ''}` : '—')
                    : (doc.status === 'READY' ? doc.chunkCount : '—')}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {doc.status !== 'PROCESSING' && (
                      <Tooltip label="Retrain (re-embed)">
                        <button onClick={() => onRetrain(doc.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary" aria-label="Retrain">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip label="Delete">
                      <button onClick={() => onDelete(doc.id, doc.name)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

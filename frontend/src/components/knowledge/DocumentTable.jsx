
/**
 * WHY this component exists:
 *   Shows all knowledge base documents in a table with their status,
 *   source type, chunk count, and action buttons.
 *
 * WHAT it does:
 *   - Status badge: colored indicator (green=READY, yellow=PROCESSING, red=FAILED)
 *   - Source type badge: PDF / FAQ / TEXT
 *   - Chunk count: how many pieces the document was split into
 *   - Actions: Retrain (refresh embedding), Delete
 *
 * HOW the polling works:
 *   PROCESSING documents need to auto-refresh because the background job
 *   finishes asynchronously. The parent page passes an onRefresh callback
 *   that re-fetches the list every few seconds until all docs are READY.
 */

import { Trash2, RefreshCw, FileText, MessageSquare, AlignLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

const SOURCE_ICONS = {
  PDF:  FileText,
  FAQ:  MessageSquare,
  TEXT: AlignLeft,
};

const SOURCE_COLORS = {
  PDF:  'bg-red-50 text-red-700',
  FAQ:  'bg-blue-50 text-blue-700',
  TEXT: 'bg-gray-100 text-gray-700',
};

const STATUS_CONFIG = {
  READY:      { label: 'Ready',      icon: CheckCircle, className: 'text-green-700 bg-green-50' },
  PROCESSING: { label: 'Processing', icon: Clock,        className: 'text-yellow-700 bg-yellow-50' },
  FAILED:     { label: 'Failed',     icon: XCircle,      className: 'text-red-700 bg-red-50' },
};

export default function DocumentTable({ documents, onDelete, onRetrain }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No documents yet. Upload a PDF, add a FAQ, or paste text above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Document</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Chunks</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Added</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map(doc => {
            const StatusIcon = STATUS_CONFIG[doc.status]?.icon || Clock;
            const SourceIcon = SOURCE_ICONS[doc.sourceType] || FileText;

            return (
              <tr key={doc.id} className="hover:bg-gray-50">
                {/* Document name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <SourceIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</p>
                      {doc.fileSize && (
                        <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Source type badge */}
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[doc.sourceType]}`}>
                    {doc.sourceType}
                  </span>
                </td>

                {/* Status badge */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[doc.status]?.className}`}>
                      <StatusIcon className={`w-3 h-3 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                      {STATUS_CONFIG[doc.status]?.label || doc.status}
                    </span>
                  </div>
                  {doc.status === 'FAILED' && doc.errorMessage && (
                    <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={doc.errorMessage}>
                      {doc.errorMessage}
                    </p>
                  )}
                </td>

                {/* Chunk count */}
                <td className="py-3 px-4">
                  <span className="text-gray-700">
                    {doc.status === 'READY' ? doc.chunkCount : '—'}
                  </span>
                </td>

                {/* Created date */}
                <td className="py-3 px-4 text-gray-500">
                  {new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {/* Retrain button — shown for READY and FAILED */}
                    {doc.status !== 'PROCESSING' && (
                      <button
                        onClick={() => onRetrain(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Retrain (re-embed)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => onDelete(doc.id, doc.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

/**
 * WHY this page exists:
 *   The Agent Inbox — where chatbot owners handle live visitor requests.
 *   When a visitor clicks "Talk to a human" in the embed widget,
 *   a handoff request appears here with PENDING status.
 *   The owner (acting as "agent") can accept it, read the conversation history,
 *   reply to the visitor, and close the session.
 *
 * HOW polling works:
 *   The page polls GET /api/handoffs every 5 seconds to check for new requests.
 *   This is simpler than WebSockets and sufficient for low-volume use.
 *   A badge in the sidebar shows the count of PENDING handoffs.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Headphones, Clock, CheckCircle, XCircle, Send,
  User, Bot, Loader2, RefreshCw, MessageSquare
} from 'lucide-react';
import {
  getHandoffs, getHandoff, acceptHandoff, agentReply, closeHandoff
} from '@/lib/handoff';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE:  'bg-green-100 text-green-700',
  CLOSED:  'bg-gray-100 text-gray-500',
};

const STATUS_ICONS = {
  PENDING: Clock,
  ACTIVE:  CheckCircle,
  CLOSED:  XCircle,
};

export default function AgentPage() {
  const [handoffs, setHandoffs] = useState([]);
  const [selected, setSelected] = useState(null);  // full handoff with messages
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  // Load the list of handoffs
  const loadHandoffs = useCallback(async () => {
    try {
      const data = await getHandoffs();
      setHandoffs(data);
    } catch { /* silent polling failure */ }
    finally { setLoading(false); }
  }, []);

  // Poll every 5 seconds for new handoffs
  useEffect(() => {
    loadHandoffs();
    pollingRef.current = setInterval(loadHandoffs, 5000);
    return () => clearInterval(pollingRef.current);
  }, [loadHandoffs]);

  // Reload selected handoff when list updates (new messages from polling)
  useEffect(() => {
    if (selectedId) {
      getHandoff(selectedId).then(setSelected).catch(() => {});
    }
  }, [handoffs, selectedId]);

  async function handleSelect(handoff) {
    setSelectedId(handoff.id);
    try {
      const full = await getHandoff(handoff.id);
      setSelected(full);
    } catch { setError('Failed to load handoff.'); }
  }

  async function handleAccept() {
    if (!selected) return;
    try {
      const updated = await acceptHandoff(selected.id);
      setSelected(prev => ({ ...prev, ...updated }));
      setHandoffs(prev => prev.map(h => h.id === selected.id ? { ...h, ...updated } : h));
    } catch { setError('Failed to accept handoff.'); }
  }

  async function handleReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const msg = await agentReply(selected.id, replyText.trim());
      setSelected(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
      setReplyText('');
    } catch { setError('Failed to send reply.'); }
    finally { setSending(false); }
  }

  async function handleClose() {
    if (!selected) return;
    if (!confirm('Close this handoff session?')) return;
    try {
      await closeHandoff(selected.id);
      setHandoffs(prev => prev.map(h =>
        h.id === selected.id ? { ...h, status: 'CLOSED' } : h));
      setSelected(prev => ({ ...prev, status: 'CLOSED' }));
    } catch { setError('Failed to close.'); }
  }

  function formatTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin text-brand-500 mr-2" />
      <span className="text-gray-500">Loading agent inbox...</span>
    </div>
  );

  const pendingCount = handoffs.filter(h => h.status === 'PENDING').length;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Agent Inbox</h1>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button onClick={loadHandoffs} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {handoffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
            <Headphones className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No handoff requests</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            When a visitor clicks "Talk to a human" in your chatbot widget,
            their request will appear here. Polling every 5 seconds.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)]">

          {/* ── Handoff List (left) ───────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-y-auto">
            {handoffs.map(h => {
              const Icon = STATUS_ICONS[h.status] || Clock;
              return (
                <button
                  key={h.id}
                  onClick={() => handleSelect(h)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50
                               transition-colors ${selectedId === h.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {h.visitorName || 'Anonymous Visitor'}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${STATUS_COLORS[h.status]}`}>
                      {h.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{h.visitorEmail || 'No email'}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(h.requestedAt)}</p>
                </button>
              );
            })}
          </div>

          {/* ── Handoff Detail (right) ────────────────────────────────── */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <Headphones className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Select a handoff to view details</p>
              </div>
            ) : (
              <>
                {/* ── Handoff header ──────────────────────────── */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {selected.visitorName || 'Anonymous Visitor'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                        {selected.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {selected.visitorEmail} · Requested {formatTime(selected.requestedAt)}
                    </p>
                    {selected.reason && (
                      <p className="text-xs text-gray-600 mt-1 italic">"{selected.reason}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selected.status === 'PENDING' && (
                      <button onClick={handleAccept} className="btn-primary text-xs py-1.5 px-3">
                        Accept
                      </button>
                    )}
                    {selected.status === 'ACTIVE' && (
                      <button onClick={handleClose} className="btn-secondary text-xs py-1.5 px-3 text-red-600">
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Conversation history ─────────────────────── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {(!selected.messages || selected.messages.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center py-4">No messages in this conversation</p>
                  ) : (
                    selected.messages.map(msg => (
                      <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                                         ${msg.role === 'user' ? 'bg-gray-100' : 'bg-brand-100'}`}>
                          {msg.role === 'user'
                            ? <User className="w-3.5 h-3.5 text-gray-500" />
                            : <Bot className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                                          ${msg.role === 'user'
                                            ? 'bg-gray-100 text-gray-800 rounded-br-none'
                                            : 'bg-brand-600 text-white rounded-bl-none'}`}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Agent reply input ────────────────────────── */}
                {selected.status === 'ACTIVE' && (
                  <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReply()}
                      placeholder="Type your reply as agent..."
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2
                                 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      className="w-9 h-9 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200
                                 text-white rounded-xl flex items-center justify-center transition-colors"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {selected.status === 'PENDING' && (
                  <div className="border-t border-gray-100 p-3 flex-shrink-0">
                    <p className="text-xs text-center text-gray-400">
                      Accept the handoff to reply to this visitor.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

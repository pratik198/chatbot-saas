/**
 * WHY this page exists:
 *   Shows all leads captured by the user's chatbots.
 *   A "lead" is a visitor who filled the contact form before/during chatting.
 *   This is the core value of a chatbot SaaS — turning website visitors into contacts.
 *
 * WHAT it does:
 *   - Lists all leads across all chatbots, newest first
 *   - Shows unread leads with a blue dot
 *   - Click a lead → mark it as read + expand details
 *   - "Mark all as read" button
 *   - Filter by chatbot (dropdown)
 */

import { useState, useEffect } from 'react';
import { Users, Mail, Phone, MessageSquare, Bot, CheckCheck, Circle, Loader2 } from 'lucide-react';
import { getAllLeads, markLeadAsRead, markAllLeadsAsRead } from '@/lib/leads';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [filterBot, setFilterBot] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const data = await getAllLeads();
      setLeads(data);
    } catch {
      setError('Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLead(lead) {
    setSelectedLead(lead);
    if (!lead.read) {
      try {
        await markLeadAsRead(lead.id);
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, read: true } : l));
      } catch { /* silent */ }
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllLeadsAsRead();
      setLeads(prev => prev.map(l => ({ ...l, read: true })));
      if (selectedLead) setSelectedLead(prev => ({ ...prev, read: true }));
    } catch { setError('Failed to mark all as read.'); }
    finally { setMarkingAll(false); }
  }

  // Unique chatbot names for filter dropdown
  const chatbotNames = [...new Set(leads.map(l => l.chatbotName).filter(Boolean))];
  const filtered = filterBot === 'all' ? leads : leads.filter(l => l.chatbotName === filterBot);
  const unreadCount = leads.filter(l => !l.read).length;

  function formatDate(d) {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin text-brand-500 mr-2" />
      <span className="text-gray-500">Loading leads...</span>
    </div>
  );

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <select
            value={filterBot}
            onChange={e => setFilterBot(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All chatbots</option>
            {chatbotNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 text-sm btn-secondary"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No leads yet</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            Enable the lead form on your chatbot, publish it, then embed it on your website.
            Leads will appear here when visitors fill the form.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)]">

          {/* ── Leads List (left) ─────────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-y-auto">
            {filtered.map(lead => (
              <button
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50
                            transition-colors ${selectedLead?.id === lead.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!lead.read
                      ? <Circle className="w-2.5 h-2.5 text-brand-500 fill-brand-500" />
                      : <Circle className="w-2.5 h-2.5 text-gray-200 fill-gray-200" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${!lead.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {lead.visitorName || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{lead.visitorEmail}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {lead.chatbotName}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(lead.capturedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ── Lead Detail (right) ───────────────────────────────────── */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
            {!selectedLead ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Users className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Select a lead to view details</p>
              </div>
            ) : (
              <div>
                {/* Name + source badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-brand-700">
                        {selectedLead.visitorName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedLead.visitorName || 'Anonymous Visitor'}
                      </h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedLead.source === 'WIDGET'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedLead.source === 'WIDGET' ? 'From Website Widget' : 'Dashboard Test'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(selectedLead.capturedAt)}</p>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <InfoCard icon={Mail} label="Email" value={selectedLead.visitorEmail} />
                  <InfoCard icon={Phone} label="Phone" value={selectedLead.visitorPhone || '—'} />
                  <InfoCard icon={Bot} label="Chatbot" value={selectedLead.chatbotName} />
                  {selectedLead.conversationId && (
                    <InfoCard icon={MessageSquare} label="Conversation" value={`#${selectedLead.conversationId}`} />
                  )}
                </div>

                {/* Initial message */}
                {selectedLead.initialMessage && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Initial message
                    </p>
                    <p className="text-sm text-gray-700">{selectedLead.initialMessage}</p>
                  </div>
                )}

                {/* Email quick-action */}
                <div className="mt-6 flex gap-3">
                  <a
                    href={`mailto:${selectedLead.visitorEmail}`}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}

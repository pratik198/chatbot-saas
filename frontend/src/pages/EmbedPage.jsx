/**
 * WHY this page exists:
 *   This is the page that loads INSIDE the iframe on external websites.
 *   It renders a standalone chat UI (no sidebar, no navbar) that visitors see.
 *
 * HOW the embed flow works:
 *   1. Website owner adds <script> tag to their site
 *   2. widget.js runs → creates an iframe pointing to /embed/{chatbotId}
 *   3. THIS PAGE loads inside that iframe
 *   4. It calls the public /api/widget/* endpoints (no auth required)
 *   5. Visitor chats → lead form → conversations saved to dashboard
 *
 * Route: /embed/:chatbotId  (standalone — NOT inside DashboardLayout)
 * Auth:  NONE — anonymous visitors access this page
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Loader2, X, PhoneCall } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function EmbedPage() {
  const { chatbotId } = useParams();

  // ── Session & Config ──────────────────────────────────────────────────────
  const [config, setConfig] = useState(null);        // chatbot name, colors, welcome msg
  const [sessionToken, setSessionToken] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');

  // ── Lead Form ─────────────────────────────────────────────────────────────
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadData, setLeadData] = useState({ visitorName: '', visitorEmail: '', visitorPhone: '' });
  const [submittingLead, setSubmittingLead] = useState(false);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [requestedHandoff, setRequestedHandoff] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const SESSION_KEY = `widget_session_${chatbotId}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load chatbot config + restore session ─────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        // 1. Get chatbot public config
        const cfgRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/config`);
        if (!cfgRes.ok) throw new Error('Chatbot not found or not published');
        const cfgData = await cfgRes.json();
        setConfig(cfgData.data);

        // 2. Show lead form if enabled and not yet submitted
        const alreadySubmitted = localStorage.getItem(`lead_submitted_${chatbotId}`);
        if (cfgData.data.leadFormEnabled && !alreadySubmitted) {
          setShowLeadForm(true);
          setLoadingConfig(false);
          return;
        }

        // 3. Restore or create session
        const existingToken = localStorage.getItem(SESSION_KEY);
        const sessRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: existingToken }),
        });
        const sessData = await sessRes.json();
        const token = sessData.data.sessionToken;
        setSessionToken(token);
        localStorage.setItem(SESSION_KEY, token);

        // Restore previous messages if session exists
        if (sessData.data.conversationId) {
          setConversationId(sessData.data.conversationId);
          setMessages(sessData.data.messages || []);
        }
      } catch (e) {
        setConfigError(e.message || 'Failed to load chatbot');
      } finally {
        setLoadingConfig(false);
      }
    }
    init();
  }, [chatbotId]);

  // ── Submit lead form ──────────────────────────────────────────────────────
  async function handleLeadSubmit(e) {
    e.preventDefault();
    if (!leadData.visitorName || !leadData.visitorEmail) return;
    setSubmittingLead(true);
    try {
      await fetch(`${API_BASE}/api/widget/${chatbotId}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leadData }),
      });
      localStorage.setItem(`lead_submitted_${chatbotId}`, '1');
      setLeadSubmitted(true);
      setShowLeadForm(false);

      // Now start session after lead form
      const sessRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const sessData = await sessRes.json();
      setSessionToken(sessData.data.sessionToken);
      localStorage.setItem(SESSION_KEY, sessData.data.sessionToken);
    } catch {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmittingLead(false);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending || !sessionToken) return;

    setInputText('');
    setSending(true);
    setError('');

    const tempUser = { id: 'tu-' + Date.now(), role: 'user', content: text };
    const tempAi   = { id: 'ta-' + Date.now(), role: 'assistant', content: null };
    setMessages(prev => [...prev, tempUser, tempAi]);

    try {
      const res = await fetch(`${API_BASE}/api/widget/${chatbotId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const result = data.data;
      setConversationId(result.conversationId);
      setMessages(prev =>
        prev
          .filter(m => m.id !== tempUser.id && m.id !== tempAi.id)
          .concat([result.userMessage, result.assistantMessage])
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempUser.id && m.id !== tempAi.id));
      setError('Failed to send. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // ── Request human agent ───────────────────────────────────────────────────
  async function handleRequestHandoff() {
    setRequestedHandoff(true);
    try {
      await fetch(`${API_BASE}/api/widget/${chatbotId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Visitor requested human assistance',
          visitorName: leadData.visitorName || null,
          visitorEmail: leadData.visitorEmail || null,
          conversationId: conversationId,
        }),
      });
      setMessages(prev => [...prev, {
        id: 'handoff-' + Date.now(),
        role: 'assistant',
        content: 'A human agent has been notified and will join shortly. Please wait.',
      }]);
    } catch {
      setRequestedHandoff(false);
      setError('Failed to request agent. Please try again.');
    }
  }

  const themeColor = config?.themeColor || '#2563eb';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingConfig) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeColor }} />
    </div>
  );

  if (configError) return (
    <div className="h-screen flex items-center justify-center bg-white p-6 text-center">
      <div>
        <p className="text-gray-500 text-sm">{configError}</p>
        <p className="text-gray-400 text-xs mt-1">
          Make sure this chatbot is published.
        </p>
      </div>
    </div>
  );

  // ── Lead Form ─────────────────────────────────────────────────────────────
  if (showLeadForm) return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: themeColor }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">{config?.name}</p>
          <p className="text-white/70 text-xs">Before we start, tell us about you</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleLeadSubmit} className="w-full max-w-sm space-y-3">
          <h3 className="text-base font-semibold text-gray-800 text-center mb-4">
            👋 Let's get started!
          </h3>
          <input
            type="text"
            placeholder="Your name *"
            value={leadData.visitorName}
            onChange={e => setLeadData(p => ({ ...p, visitorName: e.target.value }))}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': themeColor }}
          />
          <input
            type="email"
            placeholder="Your email *"
            value={leadData.visitorEmail}
            onChange={e => setLeadData(p => ({ ...p, visitorEmail: e.target.value }))}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={leadData.visitorPhone}
            onChange={e => setLeadData(p => ({ ...p, visitorPhone: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submittingLead}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: themeColor }}
          >
            {submittingLead ? 'Starting...' : 'Start chatting →'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLeadForm(false);
              localStorage.setItem(`lead_submitted_${chatbotId}`, '1');
            }}
            className="w-full text-xs text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );

  // ── Chat UI ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ backgroundColor: themeColor }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">{config?.name}</p>
          <p className="text-white/70 text-xs">AI-powered assistant</p>
        </div>
        {!requestedHandoff && (
          <button
            onClick={handleRequestHandoff}
            title="Talk to a human"
            className="text-white/70 hover:text-white transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Welcome message */}
      {messages.length === 0 && config?.welcomeMessage && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 mt-0.5" style={{ color: themeColor }} />
            <p className="text-sm text-gray-700">{config.welcomeMessage}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-4">
            Type a message to get started!
          </p>
        )}
        {messages.map(msg => (
          <EmbedMessage key={msg.id} message={msg} themeColor={themeColor} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-3 pb-2 flex-shrink-0">
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5
                     focus:outline-none focus:ring-2 focus:border-transparent
                     disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center
                     disabled:opacity-40 transition-all flex-shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 pb-2">
        Powered by ChatBot SaaS
      </p>
    </div>
  );
}

function EmbedMessage({ message, themeColor }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-100' : ''}`}
           style={!isUser ? { backgroundColor: themeColor + '20' } : {}}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-gray-500" />
          : <Bot className="w-3.5 h-3.5" style={{ color: themeColor }} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                       ${isUser ? 'rounded-br-none text-white' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}
           style={isUser ? { backgroundColor: themeColor } : {}}>
        {message.content === null ? (
          <div className="flex gap-1 py-0.5">
            {[0, 150, 300].map(d => (
              <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
        )}
      </div>
    </div>
  );
}

/**
 * EmbedPage — the standalone widget loaded inside the iframe on customer sites.
 *
 * Public, no auth, calls /api/widget/* — ALL logic preserved (config load,
 * session restore, lead form, send, human handoff). Deliberately self-contained
 * light styling (slate palette + the chatbot's themeColor) so it renders
 * identically on any host site regardless of the dashboard's theme.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Loader2, PhoneCall, Sparkles } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function EmbedPage() {
  const { chatbotId } = useParams();
  const [config, setConfig] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ visitorName: '', visitorEmail: '', visitorPhone: '' });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [requestedHandoff, setRequestedHandoff] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const SESSION_KEY = `widget_session_${chatbotId}`;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    async function init() {
      try {
        const cfgRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/config`);
        if (!cfgRes.ok) throw new Error('Chatbot not found or not published');
        const cfgData = await cfgRes.json();
        setConfig(cfgData.data);

        const alreadySubmitted = localStorage.getItem(`lead_submitted_${chatbotId}`);
        if (cfgData.data.leadFormEnabled && !alreadySubmitted) { setShowLeadForm(true); setLoadingConfig(false); return; }

        const existingToken = localStorage.getItem(SESSION_KEY);
        const sessRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/session`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: existingToken }),
        });
        const sessData = await sessRes.json();
        const token = sessData.data.sessionToken;
        setSessionToken(token);
        localStorage.setItem(SESSION_KEY, token);
        if (sessData.data.conversationId) { setConversationId(sessData.data.conversationId); setMessages(sessData.data.messages || []); }
      } catch (e) {
        setConfigError(e.message || 'Failed to load chatbot');
      } finally { setLoadingConfig(false); }
    }
    init();
  }, [chatbotId]);

  async function handleLeadSubmit(e) {
    e.preventDefault();
    if (!leadData.visitorName || !leadData.visitorEmail) return;
    setSubmittingLead(true);
    try {
      await fetch(`${API_BASE}/api/widget/${chatbotId}/lead`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...leadData }),
      });
      localStorage.setItem(`lead_submitted_${chatbotId}`, '1');
      setShowLeadForm(false);
      const sessRes = await fetch(`${API_BASE}/api/widget/${chatbotId}/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const sessData = await sessRes.json();
      setSessionToken(sessData.data.sessionToken);
      localStorage.setItem(SESSION_KEY, sessData.data.sessionToken);
    } catch { setError('Failed to submit form. Please try again.'); }
    finally { setSubmittingLead(false); }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending || !sessionToken) return;
    setInputText(''); setSending(true); setError('');
    const tU = { id: 'tu-' + Date.now(), role: 'user', content: text };
    const tA = { id: 'ta-' + Date.now(), role: 'assistant', content: null };
    setMessages((prev) => [...prev, tU, tA]);
    try {
      const res = await fetch(`${API_BASE}/api/widget/${chatbotId}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const result = data.data;
      setConversationId(result.conversationId);
      setMessages((prev) => prev.filter((m) => m.id !== tU.id && m.id !== tA.id).concat([result.userMessage, result.assistantMessage]));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tU.id && m.id !== tA.id));
      setError('Failed to send. Please try again.');
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  async function handleRequestHandoff() {
    setRequestedHandoff(true);
    try {
      await fetch(`${API_BASE}/api/widget/${chatbotId}/handoff`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Visitor requested human assistance', visitorName: leadData.visitorName || null, visitorEmail: leadData.visitorEmail || null, conversationId }),
      });
      setMessages((prev) => [...prev, { id: 'handoff-' + Date.now(), role: 'assistant', content: 'A human agent has been notified and will join shortly. Please wait.' }]);
    } catch { setRequestedHandoff(false); setError('Failed to request agent. Please try again.'); }
  }

  const themeColor = config?.themeColor || '#6366f1';
  const headerStyle = { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` };

  if (loadingConfig) return (
    <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="h-6 w-6 animate-spin" style={{ color: themeColor }} /></div>
  );

  if (configError) return (
    <div className="flex h-screen items-center justify-center bg-white p-6 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><Bot className="h-6 w-6 text-slate-400" /></div>
        <p className="text-sm text-slate-600">{configError}</p>
        <p className="mt-1 text-xs text-slate-400">Make sure this chatbot is published.</p>
      </div>
    </div>
  );

  if (showLeadForm) return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={headerStyle}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Bot className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold">{config?.name}</p>
          <p className="text-xs text-white/70">Before we start, tell us about you</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={handleLeadSubmit} className="w-full max-w-sm space-y-3">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={headerStyle}><Sparkles className="h-6 w-6" /></div>
            <h3 className="text-base font-semibold text-slate-800">Let's get started</h3>
          </div>
          <LeadInput placeholder="Your name *" value={leadData.visitorName} onChange={(v) => setLeadData((p) => ({ ...p, visitorName: v }))} type="text" required themeColor={themeColor} />
          <LeadInput placeholder="Your email *" value={leadData.visitorEmail} onChange={(v) => setLeadData((p) => ({ ...p, visitorEmail: v }))} type="email" required themeColor={themeColor} />
          <LeadInput placeholder="Phone (optional)" value={leadData.visitorPhone} onChange={(v) => setLeadData((p) => ({ ...p, visitorPhone: v }))} type="tel" themeColor={themeColor} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={submittingLead} className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={headerStyle}>
            {submittingLead ? 'Starting…' : 'Start chatting →'}
          </button>
          <button type="button" onClick={() => { setShowLeadForm(false); localStorage.setItem(`lead_submitted_${chatbotId}`, '1'); }} className="w-full text-xs text-slate-400 hover:text-slate-600">Skip for now</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3 text-white shadow-sm" style={headerStyle}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Bot className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{config?.name}</p>
          <p className="flex items-center gap-1 text-xs text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-green-300" /> AI assistant · online</p>
        </div>
        {!requestedHandoff && (
          <button onClick={handleRequestHandoff} title="Talk to a human" className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"><PhoneCall className="h-4 w-4" /></button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.length === 0 && config?.welcomeMessage && (
          <div className="flex items-start gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${themeColor}22` }}><Bot className="h-3.5 w-3.5" style={{ color: themeColor }} /></div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-slate-200 bg-white px-3 py-2 shadow-sm"><p className="text-xs leading-relaxed text-slate-700">{config.welcomeMessage}</p></div>
          </div>
        )}
        {messages.length === 0 && !config?.welcomeMessage && <p className="pt-4 text-center text-xs text-slate-400">Type a message to get started!</p>}
        {messages.map((msg) => <EmbedMessage key={msg.id} message={msg} themeColor={themeColor} />)}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="flex-shrink-0 px-3 pb-2"><p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{error}</p></div>}

      <div className="flex flex-shrink-0 gap-2 border-t border-slate-100 bg-white p-3">
        <input ref={inputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…" disabled={sending}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-shadow focus:ring-2 disabled:opacity-50"
          style={{ '--tw-ring-color': themeColor }} />
        <button onClick={handleSend} disabled={!inputText.trim() || sending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40" style={{ backgroundColor: themeColor }}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      <p className="bg-white pb-2 text-center text-[11px] text-slate-300">Powered by Lumina AI</p>
    </div>
  );
}

function LeadInput({ placeholder, value, onChange, type, required, themeColor }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} required={required}
      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-shadow focus:ring-2"
      style={{ '--tw-ring-color': themeColor }} />
  );
}

function EmbedMessage({ message, themeColor }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex animate-fade-in items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={isUser ? { backgroundColor: '#f1f5f9' } : { backgroundColor: `${themeColor}22` }}>
        {isUser ? <User className="h-3.5 w-3.5 text-slate-500" /> : <Bot className="h-3.5 w-3.5" style={{ color: themeColor }} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${isUser ? 'rounded-br-none text-white' : 'rounded-bl-none border border-slate-200 bg-white text-slate-800 shadow-sm'}`}
        style={isUser ? { backgroundColor: themeColor } : {}}>
        {message.content === null ? (
          <div className="flex gap-1 py-0.5">{[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}</div>
        ) : (
          <p className="whitespace-pre-wrap [word-break:break-word]">{message.content}</p>
        )}
      </div>
    </div>
  );
}

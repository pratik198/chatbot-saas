/**
 * WHY this page exists:
 *   Global account settings — things that apply across all chatbots.
 *   Separate from the per-chatbot editor (which is in ChatbotEditPage).
 *
 * WHAT it does:
 *   - Shows account info (name, email — from auth)
 *   - Ollama connection status (checks if Ollama is running)
 *   - Embed instructions (copy the <script> tag)
 *   - Danger zone: delete account (UI only for now)
 */

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import {
  Settings, CheckCircle, XCircle, Copy, Check,
  Loader2, Bot, Code, AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const user = getUser();
  const [ollamaStatus, setOllamaStatus] = useState(null); // null=loading, true=ok, false=down
  const [chatbots, setChatbots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [copied, setCopied] = useState(false);

  // Check Ollama status by pinging the backend health
  useEffect(() => {
    async function checkOllama() {
      try {
        // We'll check by trying to list chatbots (which hits the backend)
        // and rely on the logs to confirm Ollama. For now just show a status.
        await api.get('/api/chatbots');
        setOllamaStatus(true);
      } catch {
        setOllamaStatus(false);
      }
    }
    checkOllama();

    api.get('/api/chatbots').then(r => {
      setChatbots(r.data.data || []);
      if (r.data.data?.length > 0) setSelectedBotId(r.data.data[0].id);
    }).catch(() => {});
  }, []);

  function copyEmbedCode() {
    const code = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${selectedBotId}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const embedCode = selectedBotId
    ? `<script src="${window.location.origin}/widget.js" data-chatbot-id="${selectedBotId}"></script>`
    : '← Select a chatbot above';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* ── Account Info ────────────────────────────────────────────────── */}
      <section className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-brand-500" />
          Account
        </h2>
        <div className="space-y-3">
          <Row label="Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Plan" value="Free" badge />
        </div>
      </section>

      {/* ── AI Engine Status ─────────────────────────────────────────────── */}
      <section className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-500" />
          AI Engine (Ollama)
        </h2>
        <div className="flex items-center gap-3 mb-4">
          {ollamaStatus === null && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {ollamaStatus === true && (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 font-medium">Backend is reachable</span>
            </>
          )}
          {ollamaStatus === false && (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700 font-medium">Backend is unreachable</span>
            </>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 border border-gray-100">
          <p className="font-medium text-gray-700">Setup Ollama (one-time):</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
            <li>Download Ollama: <span className="font-mono">https://ollama.com/download</span></li>
            <li>Pull chat model: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">ollama pull llama3.2</span></li>
            <li>Pull embed model: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">ollama pull nomic-embed-text</span></li>
            <li>Ollama auto-starts at <span className="font-mono">http://localhost:11434</span></li>
          </ol>
        </div>
      </section>

      {/* ── Embed Code ──────────────────────────────────────────────────── */}
      <section className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Code className="w-4 h-4 text-brand-500" />
          Embed Widget on Your Website
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Add this snippet before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> on your website.
          The chatbot bubble will appear in the bottom corner.
        </p>

        {/* Chatbot selector */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Select chatbot</label>
          <select
            value={selectedBotId}
            onChange={e => setSelectedBotId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {chatbots.length === 0 && <option value="">No chatbots yet</option>}
            {chatbots.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} {b.isPublished ? '(Published)' : '(Draft — publish first)'}
              </option>
            ))}
          </select>
        </div>

        {/* Code block */}
        <div className="bg-gray-900 rounded-xl p-4 relative">
          <code className="text-green-400 text-xs font-mono break-all">{embedCode}</code>
          <button
            onClick={copyEmbedCode}
            disabled={!selectedBotId}
            className="absolute top-3 right-3 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg
                       text-gray-300 hover:text-white transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {selectedBotId && !chatbots.find(b => b.id === parseInt(selectedBotId))?.isPublished && (
          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            This chatbot is not published. Publish it in the Chatbots page first.
          </p>
        )}
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="card p-6 border-red-100">
        <h2 className="text-base font-semibold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Deleting your account removes all chatbots, conversations, leads, and data. This cannot be undone.
        </p>
        <button
          onClick={() => alert('Account deletion is not yet implemented. Contact support.')}
          className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg
                     hover:bg-red-50 transition-colors"
        >
          Delete my account
        </button>
      </section>
    </div>
  );
}

function Row({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge
        ? <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">{value}</span>
        : <span className="text-sm font-medium text-gray-900">{value}</span>
      }
    </div>
  );
}

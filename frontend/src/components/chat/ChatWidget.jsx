/**
 * WHY this component exists:
 *   The Vodafone-style floating chat bubble that appears on every dashboard page.
 *   It lets the chatbot owner test their bot WITHOUT leaving the current page.
 *   Just like how real-world websites (Vodafone, Intercom, Drift) have a floating
 *   chat button in the bottom-right corner.
 *
 * WHAT it does:
 *   - Shows a floating circular button in the bottom-right corner
 *   - Clicking it slides open a chat panel above the button
 *   - Owner can select which chatbot to test via a dropdown
 *   - Sends messages → calls Ollama AI → shows reply with typing indicator
 *   - Persists the conversation as long as the panel is open
 *   - Clicking X closes (minimizes) the panel
 *
 * HOW it fits in the layout:
 *   Mounted inside DashboardLayout (renders on every dashboard page).
 *   Uses `position: fixed` so it floats over ALL page content.
 *   z-index: 50 so it sits above page content but can be overlaid by modals.
 *
 * HOW the chat works:
 *   Uses the same chat API as ConversationsPage:
 *     startConversation() → creates new conversation + gets first AI reply
 *     sendMessage()       → continues the conversation
 *   When the widget is re-opened after closing, it remembers the conversation.
 */

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, ChevronDown } from 'lucide-react';
import { startConversation, sendMessage } from '@/lib/chat';
import api from '@/lib/api';

export default function ChatWidget() {
  // ─── Widget Open/Close ──────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // ─── Chatbot Selection ──────────────────────────────────────────────────────
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);

  // ─── Conversation State ─────────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Load chatbots on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/chatbots');
        const bots = res.data.data || [];
        setChatbots(bots);
        // Auto-select first active chatbot
        const active = bots.find(b => b.isActive) || bots[0];
        if (active) setSelectedChatbot(active);
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        setLoadingBots(false);
      }
    }
    load();
  }, []);

  // ─── Open / Close ───────────────────────────────────────────────────────────
  function toggleWidget() {
    if (!isOpen) {
      setIsOpen(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 200);
    }
  }

  // When the user switches chatbot, start a fresh conversation
  function switchChatbot(bot) {
    setSelectedChatbot(bot);
    setConversationId(null);
    setMessages([]);
    setError('');
    setShowBotPicker(false);
  }

  // ─── Send Message ───────────────────────────────────────────────────────────
  async function handleSend() {
    const text = inputText.trim();
    if (!text || isSending || !selectedChatbot) return;

    setInputText('');
    setIsSending(true);
    setError('');

    // Optimistic: show user message + typing indicator immediately
    const tempUserId = 'tmp-u-' + Date.now();
    const tempAiId = 'tmp-a-' + Date.now();
    setMessages(prev => [
      ...prev,
      { id: tempUserId, role: 'user', content: text },
      { id: tempAiId, role: 'assistant', content: null }, // null = typing dots
    ]);

    try {
      let result;
      if (conversationId) {
        result = await sendMessage(conversationId, text);
      } else {
        result = await startConversation(selectedChatbot.id, text);
        setConversationId(result.conversationId);
      }

      // Replace temp messages with real ones from server
      setMessages(prev =>
        prev
          .filter(m => m.id !== tempUserId && m.id !== tempAiId)
          .concat([result.userMessage, result.assistantMessage])
      );
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== tempAiId));
      setError('Ollama not responding. Is it running?');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ══════════════════════════════════════════════════════
          CHAT PANEL — slides up from the button
          ══════════════════════════════════════════════════════ */}
      {isOpen && (
        <div className={`
          w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden
          transition-all duration-300 ease-out
          ${isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
        `}
          style={{ height: '480px' }}
        >
          {/* ── Widget Header ──────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: selectedChatbot?.themeColor || '#2563eb' }}
          >
            {/* Bot avatar */}
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>

            {/* Bot name + chatbot picker */}
            <div className="flex-1 min-w-0">
              {loadingBots ? (
                <p className="text-white text-sm font-medium">Loading...</p>
              ) : chatbots.length === 0 ? (
                <p className="text-white text-sm font-medium">No chatbots yet</p>
              ) : (
                <button
                  onClick={() => setShowBotPicker(p => !p)}
                  className="flex items-center gap-1 text-white text-sm font-semibold
                             hover:text-white/80 transition-colors truncate max-w-full"
                >
                  <span className="truncate">{selectedChatbot?.name || 'Select bot'}</span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                </button>
              )}
              <p className="text-white/70 text-xs">Test your AI chatbot</p>
            </div>

            {/* Close button */}
            <button
              onClick={toggleWidget}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Chatbot Picker Dropdown ───────────────────── */}
          {showBotPicker && chatbots.length > 0 && (
            <div className="border-b border-gray-100 bg-gray-50 py-1 flex-shrink-0">
              {chatbots.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => switchChatbot(bot)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors
                              flex items-center gap-2
                              ${selectedChatbot?.id === bot.id ? 'text-brand-600 font-medium' : 'text-gray-700'}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bot.themeColor || '#2563eb' }}
                  />
                  {bot.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Welcome Banner (when no messages yet) ──────── */}
          {messages.length === 0 && selectedChatbot?.welcomeMessage && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 mt-0.5 flex-shrink-0"
                     style={{ color: selectedChatbot.themeColor || '#2563eb' }} />
                <p className="text-sm text-gray-700">{selectedChatbot.welcomeMessage}</p>
              </div>
            </div>
          )}

          {/* ── Empty state ────────────────────────────────── */}
          {messages.length === 0 && !selectedChatbot?.welcomeMessage && (
            <div className="flex-1 flex items-center justify-center px-4 text-center">
              <div>
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  {chatbots.length === 0
                    ? 'Create a chatbot first to test it here.'
                    : 'Type a message to test your chatbot!'}
                </p>
              </div>
            </div>
          )}

          {/* ── Messages ───────────────────────────────────── */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map(msg => (
                <WidgetMessage
                  key={msg.id}
                  message={msg}
                  themeColor={selectedChatbot?.themeColor}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── Error ──────────────────────────────────────── */}
          {error && (
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            </div>
          )}

          {/* ── Input Bar ──────────────────────────────────── */}
          <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedChatbot ? 'Type a message...' : 'Select a chatbot first'}
              disabled={isSending || !selectedChatbot || chatbots.length === 0}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2
                         focus:outline-none focus:ring-2 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ '--tw-ring-color': selectedChatbot?.themeColor || '#2563eb' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSending || !selectedChatbot}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white
                         disabled:opacity-40 transition-all flex-shrink-0"
              style={{ backgroundColor: selectedChatbot?.themeColor || '#2563eb' }}
            >
              {isSending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <p className="text-center text-xs text-gray-400 pb-2">
            Powered by Ollama AI · <span className="font-medium">Free</span>
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FLOATING BUTTON — the main chat bubble
          ══════════════════════════════════════════════════════ */}
      <button
        onClick={toggleWidget}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                   transition-all duration-300 hover:scale-110 active:scale-95
                   relative"
        style={{ backgroundColor: selectedChatbot?.themeColor || '#2563eb' }}
        title={isOpen ? 'Close chat' : 'Test your chatbot'}
      >
        {/* Animate between open/close icons */}
        <div className={`absolute transition-all duration-200 ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
          <X className="w-6 h-6 text-white" />
        </div>
        <div className={`absolute transition-all duration-200 ${isOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`}>
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
      </button>
    </div>
  );
}

// ─── Individual message bubble ─────────────────────────────────────────────────
function WidgetMessage({ message, themeColor }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                       ${isUser ? 'bg-gray-100' : ''}`}
           style={!isUser ? { backgroundColor: (themeColor || '#2563eb') + '20' } : {}}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-gray-500" />
          : <Bot className="w-3.5 h-3.5" style={{ color: themeColor || '#2563eb' }} />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                       ${isUser
                          ? 'text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                       }`}
           style={isUser ? { backgroundColor: themeColor || '#2563eb' } : {}}>
        {message.content === null ? (
          /* Typing indicator — 3 animated dots */
          <div className="flex gap-1 py-0.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
        )}
      </div>
    </div>
  );
}

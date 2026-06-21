/**
 * WHY this page exists:
 *   This is where users chat with their chatbots and test the AI.
 *   It shows the full conversation history and lets users send new messages.
 *
 * WHAT it does:
 *   - Left panel: select a chatbot, list past conversations
 *   - Right panel: show the selected conversation + chat input
 *   - Connects to the backend RAG pipeline (Qdrant + Ollama)
 *
 * HOW the layout works:
 *   [ Conversation List (left) ] | [ Chat Messages (right) ]
 *   - Left: chatbot selector + list of past conversations
 *   - Right: message bubbles (user = right, AI = left) + input bar at bottom
 *
 * HOW a new chat works:
 *   User types → handleSend() → startConversation() or sendMessage()
 *   → Backend: embed → Qdrant search → Ollama → save → return
 *   → Frontend: add both messages to state, auto-scroll to bottom
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Plus, Trash2, Bot, User,
  ChevronDown, Loader2, AlertCircle, PanelLeft
} from 'lucide-react';
import {
  startConversation,
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation
} from '@/lib/chat';
import api from '@/lib/api';

export default function ConversationsPage() {
  // ─── State ─────────────────────────────────────────────────────────────────

  // Available chatbots for the selector dropdown
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);

  // List of conversations in the left sidebar
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  // Messages in the current conversation
  const [messages, setMessages] = useState([]);
  const [currentConversationTitle, setCurrentConversationTitle] = useState('');

  // Input and loading states
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Show/hide left sidebar on mobile
  const [showSidebar, setShowSidebar] = useState(true);

  // Loading states for the lists
  const [loadingChatbots, setLoadingChatbots] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Ref to the messages container — used to auto-scroll to bottom
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Auto-scroll to newest message ─────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ─── Load chatbots on mount ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadChatbots() {
      try {
        const response = await api.get('/api/chatbots');
        const bots = response.data.data || [];
        setChatbots(bots);
        // Auto-select the first chatbot
        if (bots.length > 0) {
          setSelectedChatbot(bots[0]);
        }
      } catch (err) {
        setError('Failed to load chatbots. Please try again.');
      } finally {
        setLoadingChatbots(false);
      }
    }
    loadChatbots();
  }, []);

  // ─── Load conversations when chatbot changes ────────────────────────────────
  const loadConversations = useCallback(async (chatbot) => {
    if (!chatbot) return;
    setLoadingConversations(true);
    setSelectedConversationId(null);
    setMessages([]);
    setCurrentConversationTitle('');

    try {
      const convs = await listConversations(chatbot.id);
      setConversations(convs);
    } catch (err) {
      setError('Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations(selectedChatbot);
  }, [selectedChatbot, loadConversations]);

  // ─── Open an existing conversation ─────────────────────────────────────────
  async function openConversation(conversationId) {
    setSelectedConversationId(conversationId);
    setLoadingMessages(true);
    setMessages([]);
    setError('');

    try {
      const conv = await getConversation(conversationId);
      setMessages(conv.messages || []);
      setCurrentConversationTitle(conv.title || 'Conversation');
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }

  // ─── Start a brand new conversation ────────────────────────────────────────
  function startNewConversation() {
    setSelectedConversationId(null);
    setMessages([]);
    setCurrentConversationTitle('');
    setError('');
    inputRef.current?.focus();
  }

  // ─── Send a message ─────────────────────────────────────────────────────────
  async function handleSend() {
    const text = inputText.trim();
    if (!text || isSending || !selectedChatbot) return;

    setInputText('');
    setIsSending(true);
    setError('');

    // Optimistically show the user's message immediately (don't wait for server)
    const tempUserMessage = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    // Show a "thinking" placeholder while waiting for Ollama
    const tempAiMessage = {
      id: 'temp-ai-' + Date.now(),
      role: 'assistant',
      content: null,   // null = show typing indicator
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAiMessage]);

    try {
      let result;

      if (selectedConversationId) {
        // Continue existing conversation
        result = await sendMessage(selectedConversationId, text);
      } else {
        // Start a new conversation with the first message
        result = await startConversation(selectedChatbot.id, text);
        setSelectedConversationId(result.conversationId);
        setCurrentConversationTitle(result.conversationTitle || text.substring(0, 60));

        // Add the new conversation to the sidebar list
        const newConv = {
          id: result.conversationId,
          chatbotId: selectedChatbot.id,
          chatbotName: selectedChatbot.name,
          title: result.conversationTitle || text.substring(0, 60),
          messageCount: 2,
          updatedAt: new Date().toISOString(),
        };
        setConversations(prev => [newConv, ...prev]);
      }

      // Replace the temp messages with the real saved messages from the server
      setMessages(prev => {
        // Remove temp messages
        const withoutTemp = prev.filter(m => !m.id.toString().startsWith('temp-'));
        return [...withoutTemp, result.userMessage, result.assistantMessage];
      });

      // Update conversation title in sidebar if it changed
      if (result.conversationTitle) {
        setCurrentConversationTitle(result.conversationTitle);
        setConversations(prev =>
          prev.map(c =>
            c.id === result.conversationId
              ? { ...c, title: result.conversationTitle, messageCount: c.messageCount + 2, updatedAt: new Date().toISOString() }
              : c
          )
        );
      }

    } catch (err) {
      // Remove temp messages on error
      setMessages(prev => prev.filter(m => !m.id.toString().startsWith('temp-')));
      setError(
        err.response?.data?.message ||
        'Failed to send message. Make sure Ollama is running (https://ollama.com).'
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  // Handle Enter key in the text input (Shift+Enter = newline, Enter = send)
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Delete a conversation ──────────────────────────────────────────────────
  async function handleDeleteConversation(e, conversationId) {
    e.stopPropagation(); // Don't trigger openConversation
    if (!confirm('Delete this conversation? This cannot be undone.')) return;

    try {
      await deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If we deleted the currently open conversation, clear the view
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
        setCurrentConversationTitle('');
      }
    } catch (err) {
      setError('Failed to delete conversation.');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loadingChatbots) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <span className="ml-2 text-gray-500">Loading chatbots...</span>
      </div>
    );
  }

  if (chatbots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No chatbots yet</h2>
        <p className="text-sm text-gray-500 mb-4">
          Create a chatbot first before starting conversations.
        </p>
        <a href="/chatbots/new" className="btn-primary text-sm">
          Create your first chatbot
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-6 -my-6 overflow-hidden">

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Conversation List
          ══════════════════════════════════════════════════════ */}
      <div className={`
        flex-shrink-0 w-72 border-r border-gray-200 bg-white flex flex-col
        ${showSidebar ? 'flex' : 'hidden'} md:flex
      `}>

        {/* ── Chatbot Selector ─────────────────────────── */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Chatbot
          </label>
          <div className="relative">
            <select
              value={selectedChatbot?.id || ''}
              onChange={e => {
                const bot = chatbots.find(b => b.id === parseInt(e.target.value));
                setSelectedChatbot(bot);
              }}
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg
                         px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none
                         focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {chatbots.map(bot => (
                <option key={bot.id} value={bot.id}>{bot.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── New Conversation Button ───────────────────── */}
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium
                       text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* ── Conversation List ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Loading...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No conversations yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Type a message to start chatting!
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {conversations.map(conv => (
                <li key={conv.id}>
                  <button
                    onClick={() => openConversation(conv.id)}
                    className={`
                      w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                      border-b border-gray-50 group relative
                      ${selectedConversationId === conv.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''}
                    `}
                  >
                    {/* Conversation title */}
                    <p className={`text-sm font-medium truncate pr-6 ${
                      selectedConversationId === conv.id ? 'text-brand-700' : 'text-gray-800'
                    }`}>
                      {conv.title || 'New Conversation'}
                    </p>
                    {/* Time + message count */}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTime(conv.updatedAt)} · {conv.messageCount} messages
                    </p>

                    {/* Delete button — shows on hover */}
                    <button
                      onClick={e => handleDeleteConversation(e, conv.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 opacity-0 group-hover:opacity-100 transition-opacity
                                 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Chat View
          ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">

        {/* ── Chat Header ──────────────────────────────── */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          {/* Mobile: toggle sidebar */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          {/* Chatbot avatar + name */}
          {selectedChatbot && (
            <>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (selectedChatbot.themeColor || '#6366f1') + '20' }}
              >
                <Bot className="w-4 h-4" style={{ color: selectedChatbot.themeColor || '#6366f1' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedChatbot.name}</p>
                {currentConversationTitle && (
                  <p className="text-xs text-gray-400 truncate max-w-xs">
                    {currentConversationTitle}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Error Banner ─────────────────────────────── */}
        {error && (
          <div className="mx-4 mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* ── Messages Area ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Empty state — no conversation selected */}
          {!selectedConversationId && messages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                Start a conversation
              </h3>
              <p className="text-sm text-gray-400 max-w-xs">
                Ask your chatbot a question below. It will search your knowledge base
                and answer using Ollama AI — 100% free.
              </p>
              {selectedChatbot?.welcomeMessage && (
                <div className="mt-6 max-w-sm">
                  <div className="flex items-start gap-2 bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                    <Bot className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{selectedChatbot.welcomeMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading messages spinner */}
          {loadingMessages && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span className="ml-2 text-sm text-gray-400">Loading messages...</span>
            </div>
          )}

          {/* Render messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} chatbot={selectedChatbot} />
          ))}

          {/* Invisible div at the bottom — we scroll here */}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ─────────────────────────────────── */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          {!selectedChatbot ? (
            <p className="text-center text-sm text-gray-400">Select a chatbot above to start chatting</p>
          ) : (
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedChatbot.name}... (Enter to send, Shift+Enter for new line)`}
                rows={1}
                disabled={isSending}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3
                           text-sm text-gray-900 placeholder-gray-400 focus:outline-none
                           focus:ring-2 focus:ring-brand-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed
                           max-h-32 overflow-y-auto"
                style={{ height: 'auto' }}
                onInput={e => {
                  // Auto-grow textarea as user types
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center
                           bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200
                           text-white rounded-xl transition-colors"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Hint text */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Powered by Ollama (free, local AI) + your knowledge base
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ───────────────────────────────────────────────────
/**
 * WHY this component exists:
 *   Renders a single chat message bubble.
 *   User messages appear on the RIGHT (blue).
 *   AI (assistant) messages appear on the LEFT (white).
 *
 * HOW the typing indicator works:
 *   When content is null, we show animated dots ("...").
 *   We set content=null for the temp AI message while waiting for Ollama.
 */
function MessageBubble({ message, chatbot }) {
  const isUser = message.role === 'user';
  const isTyping = message.content === null;

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                       ${isUser ? 'bg-brand-100' : 'bg-white border border-gray-200'}`}>
        {isUser ? (
          <User className="w-4 h-4 text-brand-600" />
        ) : (
          <Bot
            className="w-4 h-4"
            style={{ color: chatbot?.themeColor || '#6366f1' }}
          />
        )}
      </div>

      {/* Message bubble */}
      <div className={`
        max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? 'bg-brand-600 text-white rounded-br-none'
          : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none'
        }
      `}>
        {isTyping ? (
          // Animated typing indicator — 3 bouncing dots
          <div className="flex gap-1 items-center py-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          // Render message content — preserve newlines
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
}

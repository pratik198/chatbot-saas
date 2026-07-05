/**
 * ChatWidget — floating "test your bot" launcher on every dashboard page.
 * Logic unchanged (load chatbots, start/continue conversation, optimistic send).
 * Restyled: Framer Motion panel, theme-aware chrome, markdown replies.
 * Sits at z-40 so dialogs / the command palette (z-50) layer above it.
 */
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, ChevronDown, Check } from 'lucide-react';
import { Markdown } from '@/components/chat/Markdown';
import { startConversation, sendMessage } from '@/lib/chat';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/chatbots');
        const bots = res.data.data || [];
        setChatbots(bots);
        const active = bots.find((b) => b.isActive) || bots[0];
        if (active) setSelectedChatbot(active);
      } catch { /* non-critical */ } finally { setLoadingBots(false); }
    })();
  }, []);

  const color = selectedChatbot?.themeColor || '#6366f1';

  function switchChatbot(bot) {
    setSelectedChatbot(bot); setConversationId(null); setMessages([]); setError(''); setShowBotPicker(false);
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isSending || !selectedChatbot) return;
    setInputText(''); setIsSending(true); setError('');
    const tU = 'tmp-u-' + Date.now(); const tA = 'tmp-a-' + Date.now();
    setMessages((prev) => [...prev, { id: tU, role: 'user', content: text }, { id: tA, role: 'assistant', content: null }]);
    try {
      let result;
      if (conversationId) result = await sendMessage(conversationId, text);
      else { result = await startConversation(selectedChatbot.id, text); setConversationId(result.conversationId); }
      setMessages((prev) => prev.filter((m) => m.id !== tU && m.id !== tA).concat([result.userMessage, result.assistantMessage]));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tU && m.id !== tA));
      setError('Assistant not responding. Please try again.');
    } finally { setIsSending(false); inputRef.current?.focus(); }
  }

  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-[480px] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          >
            {/* header */}
            <div className="relative flex items-center gap-3 px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Bot className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                {loadingBots ? <p className="text-sm font-medium">Loading…</p>
                  : chatbots.length === 0 ? <p className="text-sm font-medium">No chatbots yet</p>
                  : (
                    <button onClick={() => setShowBotPicker((p) => !p)} className="flex max-w-full items-center gap-1 text-sm font-semibold hover:text-white/80">
                      <span className="truncate">{selectedChatbot?.name || 'Select bot'}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  )}
                <p className="text-xs text-white/70">Test your AI chatbot</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            {/* bot picker */}
            <AnimatePresence>
              {showBotPicker && chatbots.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border bg-secondary/50">
                  {chatbots.map((bot) => (
                    <button key={bot.id} onClick={() => switchChatbot(bot)}
                      className={cn('flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-secondary', selectedChatbot?.id === bot.id ? 'font-medium text-primary' : 'text-foreground')}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bot.themeColor || '#6366f1' }} />
                      <span className="flex-1 truncate">{bot.name}</span>
                      {selectedChatbot?.id === bot.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* messages */}
            <div className="flex-1 overflow-y-auto bg-background/30 px-3 py-3">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  {selectedChatbot?.welcomeMessage ? (
                    <div className="flex items-start gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-left shadow-sm">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
                      <p className="text-sm text-foreground">{selectedChatbot.welcomeMessage}</p>
                    </div>
                  ) : (
                    <>
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">{chatbots.length === 0 ? 'Create a chatbot first to test it here.' : 'Type a message to test your chatbot!'}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => <WidgetMessage key={msg.id} message={msg} color={color} />)}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {error && <div className="px-3 pb-2"><p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p></div>}

            {/* input */}
            <div className="flex gap-2 border-t border-border p-3">
              <input ref={inputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={selectedChatbot ? 'Type a message…' : 'Select a chatbot first'} disabled={isSending || !selectedChatbot || chatbots.length === 0}
                className="h-10 flex-1 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50" />
              <button onClick={handleSend} disabled={!inputText.trim() || isSending || !selectedChatbot}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40" style={{ backgroundColor: color }}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="pb-2 text-center text-2xs text-muted-foreground">Powered by Lumina AI</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating button */}
      <button onClick={() => setIsOpen((o) => !o)} title={isOpen ? 'Close chat' : 'Test your chatbot'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow transition-transform hover:scale-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {!isOpen && <span className="absolute inset-0 rounded-full opacity-60 animate-pulse-ring" style={{ backgroundColor: color }} />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={isOpen ? 'x' : 'msg'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="relative">
            {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

function WidgetMessage({ message, color }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-end gap-1.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', isUser && 'bg-secondary')} style={!isUser ? { backgroundColor: `${color}22` } : {}}>
        {isUser ? <User className="h-3.5 w-3.5 text-muted-foreground" /> : <Bot className="h-3.5 w-3.5" style={{ color }} />}
      </span>
      <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed', isUser ? 'rounded-br-none text-white' : 'rounded-bl-none border border-border bg-card text-foreground')}
        style={isUser ? { backgroundColor: color } : {}}>
        {message.content === null ? (
          <div className="flex gap-1 py-0.5">{[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: `${d}ms` }} />)}</div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap [word-break:break-word]">{message.content}</p>
        ) : (
          <Markdown content={message.content} className="text-xs" />
        )}
      </div>
    </div>
  );
}

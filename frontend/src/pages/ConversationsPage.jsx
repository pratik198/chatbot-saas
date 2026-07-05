/**
 * ConversationsPage — chat with your bots (ChatGPT-style, two-pane).
 *
 * All original logic preserved: load chatbots → conversations → messages,
 * optimistic send with a typing indicator, new/open/delete conversation.
 * Added: markdown rendering, copy, regenerate-last-answer, styled confirm.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Plus, Trash2, Bot, ChevronDown, Loader2, PanelLeft, Copy, Check, RefreshCw, Sparkles,
} from 'lucide-react';
import { Markdown } from '@/components/chat/Markdown';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import {
  startConversation, sendMessage, listConversations, getConversation, deleteConversation,
} from '@/lib/chat';
import api from '@/lib/api';
import { cn, initials, timeAgo } from '@/lib/utils';

export default function ConversationsPage() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentConversationTitle, setCurrentConversationTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingChatbots, setLoadingChatbots] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    async function loadChatbots() {
      try {
        const response = await api.get('/api/chatbots');
        const bots = response.data.data || [];
        setChatbots(bots);
        if (bots.length > 0) setSelectedChatbot(bots[0]);
      } catch {
        toast.error('Failed to load chatbots. Please try again.');
      } finally { setLoadingChatbots(false); }
    }
    loadChatbots();
  }, []);

  const loadConversations = useCallback(async (chatbot) => {
    if (!chatbot) return;
    setLoadingConversations(true);
    setSelectedConversationId(null);
    setMessages([]);
    setCurrentConversationTitle('');
    try {
      const convs = await listConversations(chatbot.id);
      setConversations(convs);
    } catch {
      toast.error('Failed to load conversations.');
    } finally { setLoadingConversations(false); }
  }, []);

  useEffect(() => { loadConversations(selectedChatbot); }, [selectedChatbot, loadConversations]);

  async function openConversation(conversationId) {
    setSelectedConversationId(conversationId);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const conv = await getConversation(conversationId);
      setMessages(conv.messages || []);
      setCurrentConversationTitle(conv.title || 'Conversation');
    } catch {
      toast.error('Failed to load messages.');
    } finally { setLoadingMessages(false); }
  }

  function startNewConversation() {
    setSelectedConversationId(null);
    setMessages([]);
    setCurrentConversationTitle('');
    inputRef.current?.focus();
  }

  async function send(text) {
    if (!text || isSending || !selectedChatbot) return;
    setIsSending(true);

    const tempUser = { id: 'temp-user-' + Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() };
    const tempAi = { id: 'temp-ai-' + Date.now(), role: 'assistant', content: null, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUser, tempAi]);

    try {
      let result;
      if (selectedConversationId) {
        result = await sendMessage(selectedConversationId, text);
      } else {
        result = await startConversation(selectedChatbot.id, text);
        setSelectedConversationId(result.conversationId);
        setCurrentConversationTitle(result.conversationTitle || text.substring(0, 60));
        setConversations((prev) => [{
          id: result.conversationId, chatbotId: selectedChatbot.id, chatbotName: selectedChatbot.name,
          title: result.conversationTitle || text.substring(0, 60), messageCount: 2, updatedAt: new Date().toISOString(),
        }, ...prev]);
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.toString().startsWith('temp-'));
        return [...withoutTemp, result.userMessage, result.assistantMessage];
      });
      if (result.conversationTitle) {
        setCurrentConversationTitle(result.conversationTitle);
        setConversations((prev) => prev.map((c) => c.id === result.conversationId
          ? { ...c, title: result.conversationTitle, messageCount: c.messageCount + 2, updatedAt: new Date().toISOString() }
          : c));
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => !m.id.toString().startsWith('temp-')));
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    send(text);
  }

  function handleRegenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser?.content) send(lastUser.content);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function doDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) { setSelectedConversationId(null); setMessages([]); setCurrentConversationTitle(''); }
      toast.success('Conversation deleted');
    } catch { toast.error('Failed to delete conversation.'); }
  }

  if (loadingChatbots) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;
  }

  if (chatbots.length === 0) {
    return (
      <Card className="py-6">
        <EmptyState icon={Bot} title="No chatbots yet" description="Create a chatbot first, then start a conversation to test it."
          action={<Button asChild><Link to="/chatbots/new"><Plus /> Create your first chatbot</Link></Button>} />
      </Card>
    );
  }

  const lastAssistant = messages.filter((m) => m.role === 'assistant' && m.content).slice(-1)[0];

  return (
    <Card className="flex h-[calc(100vh-7.5rem)] min-h-[540px] overflow-hidden p-0">
      {/* ── Left: conversations ─────────────────────────── */}
      <div className={cn('w-72 shrink-0 flex-col border-r border-border bg-card/50', showSidebar ? 'flex' : 'hidden', 'md:flex')}>
        <div className="border-b border-border p-3">
          <div className="relative">
            <select
              value={selectedChatbot?.id || ''}
              onChange={(e) => setSelectedChatbot(chatbots.find((b) => b.id === parseInt(e.target.value)))}
              className="h-10 w-full appearance-none rounded-xl border border-input bg-card pl-3 pr-9 text-sm font-medium text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {chatbots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button onClick={startNewConversation} variant="outline" className="mt-2 w-full"><Plus className="h-4 w-4" /> New conversation</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Type a message to start</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <div
                    onClick={() => openConversation(conv.id)}
                    className={cn('group relative cursor-pointer rounded-xl px-3 py-2.5 transition-colors',
                      selectedConversationId === conv.id ? 'bg-primary/10 ring-1 ring-primary/15' : 'hover:bg-secondary')}
                  >
                    <p className={cn('truncate pr-6 text-sm font-medium', selectedConversationId === conv.id ? 'text-primary' : 'text-foreground')}>
                      {conv.title || 'New conversation'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(conv.updatedAt)} · {conv.messageCount} msgs</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingDelete(conv.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right: chat ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-background/40">
        {/* header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 glass">
          <button onClick={() => setShowSidebar((s) => !s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden" aria-label="Toggle list">
            <PanelLeft className="h-5 w-5" />
          </button>
          {selectedChatbot && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${selectedChatbot.themeColor || '#6366f1'}, ${(selectedChatbot.themeColor || '#6366f1')}cc)` }}>
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{selectedChatbot.name}</p>
                {currentConversationTitle && <p className="truncate text-xs text-muted-foreground">{currentConversationTitle}</p>}
              </div>
            </>
          )}
        </div>

        {/* messages */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
          {!selectedConversationId && messages.length === 0 && !loadingMessages && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow-sm"><Sparkles className="h-7 w-7" /></div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask {selectedChatbot?.name || 'your chatbot'} a question. It searches your knowledge base and answers with AI.
              </p>
              {selectedChatbot?.welcomeMessage && (
                <div className="mt-6 max-w-sm rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-left shadow-card">
                  <p className="text-sm text-foreground">{selectedChatbot.welcomeMessage}</p>
                </div>
              )}
            </div>
          )}

          {loadingMessages && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading messages…</div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                chatbot={selectedChatbot}
                isLastAssistant={lastAssistant && msg.id === lastAssistant.id && !isSending}
                onRegenerate={handleRegenerate}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* input */}
        <div className="shrink-0 border-t border-border bg-card/60 p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring/40">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedChatbot?.name || 'your chatbot'}…`}
              rows={1}
              disabled={isSending}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'; }}
            />
            <Button size="icon" onClick={handleSend} disabled={!inputText.trim() || isSending} className="h-10 w-10 shrink-0">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter to send · Shift+Enter for a new line · answers use your knowledge base
          </p>
        </div>
      </div>

      {/* delete confirm */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>This permanently removes the conversation and its messages. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={doDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ChatMessage({ message, chatbot, isLastAssistant, onRegenerate }) {
  const isUser = message.role === 'user';
  const isTyping = message.content === null;
  const [copied, setCopied] = useState(false);

  const copy = () => navigator.clipboard?.writeText(message.content || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={cn('flex items-start gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {isUser ? (
        <Avatar className="h-8 w-8"><AvatarFallback className="text-[11px]">You</AvatarFallback></Avatar>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${chatbot?.themeColor || '#6366f1'}, ${(chatbot?.themeColor || '#6366f1')}cc)` }}>
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn('group flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn('rounded-2xl px-4 py-2.5 shadow-soft',
          isUser ? 'rounded-tr-sm bg-brand-gradient text-white' : 'rounded-tl-sm border border-border bg-card text-card-foreground')}>
          {isTyping ? (
            <div className="flex items-center gap-1 py-1">
              {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed [word-break:break-word]">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        {!isTyping && !isUser && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
            {isLastAssistant && (
              <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

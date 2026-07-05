/**
 * CommandPalette — ⌘K / Ctrl+K global search & quick actions.
 *
 * Real, working navigation (not a decorative search box): fuzzy-filters pages
 * and quick actions, arrow-key navigable, Enter to jump. Opened from the topbar
 * search field or the keyboard shortcut.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bot, BookOpen, MessageSquare, Users, BarChart2, Headphones,
  Plug, Settings, CreditCard, User, Plus, Upload, Search, CornerDownLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

const COMMANDS = [
  { group: 'Quick actions', label: 'Create new chatbot', to: '/chatbots/new', icon: Plus, keywords: 'add bot create new' },
  { group: 'Quick actions', label: 'Upload knowledge', to: '/knowledge', icon: Upload, keywords: 'pdf faq document train' },
  { group: 'Navigation', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { group: 'Navigation', label: 'Chatbots', to: '/chatbots', icon: Bot, keywords: 'bots agents' },
  { group: 'Navigation', label: 'Knowledge Base', to: '/knowledge', icon: BookOpen, keywords: 'documents faq pdf' },
  { group: 'Navigation', label: 'Conversations', to: '/conversations', icon: MessageSquare, keywords: 'chats messages' },
  { group: 'Navigation', label: 'Leads', to: '/leads', icon: Users, keywords: 'contacts customers' },
  { group: 'Navigation', label: 'Agent Inbox', to: '/agent', icon: Headphones, keywords: 'handoff support' },
  { group: 'Navigation', label: 'Analytics', to: '/analytics', icon: BarChart2, keywords: 'metrics stats charts' },
  { group: 'Navigation', label: 'Integrations', to: '/integrations', icon: Plug, keywords: 'connect api' },
  { group: 'Navigation', label: 'Settings', to: '/settings', icon: Settings, keywords: 'preferences config' },
  { group: 'Navigation', label: 'Billing', to: '/billing', icon: CreditCard, keywords: 'plan subscription payment' },
  { group: 'Navigation', label: 'Profile', to: '/profile', icon: User, keywords: 'account me' },
];

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q) || c.keywords.split(' ').some((k) => k.startsWith(q)),
    );
  }, [query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const go = (cmd) => {
    if (!cmd) return;
    onOpenChange(false);
    navigate(cmd.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  // group results preserving order
  const grouped = results.reduce((acc, cmd, idx) => {
    (acc[cmd.group] ||= []).push({ ...cmd, idx });
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="top-[15%] max-w-xl translate-y-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search pages and quick actions, then press Enter to navigate.</DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            className="h-14 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</p>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</p>
              {items.map((cmd) => {
                const Icon = cmd.icon;
                const isActive = cmd.idx === active;
                return (
                  <button
                    key={cmd.label}
                    onMouseEnter={() => setActive(cmd.idx)}
                    onClick={() => go(cmd)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card', isActive && 'border-primary/30 text-primary')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-medium text-foreground">{cmd.label}</span>
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

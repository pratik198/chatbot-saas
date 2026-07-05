/**
 * ChatbotPreview — pixel-accurate live simulation of the chat widget.
 * Props-driven, no API. Restyled for the design system (theme-aware chrome,
 * the bot bubbles keep the user's chosen themeColor).
 */
import { Send } from 'lucide-react';

export default function ChatbotPreview({ name, welcomeMessage, themeColor, widgetPosition }) {
  const chatName = name || 'My Chatbot';
  const welcome = welcomeMessage || 'Hi there! How can I help you today?';
  const color = themeColor || '#6366f1';
  const initial = chatName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col items-center justify-end pb-2">
      <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        Live preview · {widgetPosition || 'bottom-right'}
      </p>

      <div className="w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        {/* header */}
        <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">{initial}</div>
          <div>
            <p className="text-sm font-semibold text-white">{chatName}</p>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
              <p className="text-xs text-white/80">Online</p>
            </div>
          </div>
          <div className="ml-auto flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/30" />
            <span className="h-2 w-2 rounded-full bg-white/30" />
          </div>
        </div>

        {/* messages */}
        <div className="flex min-h-40 flex-col gap-3 bg-secondary/40 p-4">
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>{initial}</div>
            <div className="max-w-52 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 shadow-sm">
              <p className="text-sm text-foreground">{welcome}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-40 rounded-2xl rounded-tr-sm px-3 py-2 text-white" style={{ backgroundColor: color }}>
              <p className="text-sm">Hello!</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>{initial}</div>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2.5 shadow-sm">
              <div className="flex items-center gap-1">
                {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* input */}
        <div className="flex items-center gap-2 border-t border-border bg-card p-3">
          <input readOnly placeholder="Type your message…" className="flex-1 rounded-full border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground outline-none" />
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-border bg-card py-1.5 text-center">
          <p className="text-2xs text-muted-foreground/70">Powered by Lumina AI</p>
        </div>
      </div>

      <div className="mt-3 mr-4 self-end">
        <button className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-glow-sm" style={{ backgroundColor: color }}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      </div>
    </div>
  );
}

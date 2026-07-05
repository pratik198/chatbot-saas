/**
 * ChatbotForm — the shared tabbed configuration form used by both the
 * "New chatbot" and "Edit chatbot" pages (keeps the two in sync, no dupes).
 *
 * Controlled: parent owns `data` and passes `onChange(key, value)`.
 * `showActive` reveals the "Chatbot active" toggle (edit page only).
 */
import { MessageSquare, Sparkles, Palette, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

const SWATCHES = ['#6366f1', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#dc2626', '#ea580c', '#db2777', '#374151'];
const LANGS = [
  ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'],
  ['hi', 'Hindi'], ['ar', 'Arabic'], ['zh', 'Chinese'], ['ja', 'Japanese'],
];

const textareaCls =
  'w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

export default function ChatbotForm({ data, onChange, showActive = false }) {
  return (
    <Tabs defaultValue="basic">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic"><MessageSquare className="h-4 w-4" /> Basic</TabsTrigger>
        <TabsTrigger value="ai"><Sparkles className="h-4 w-4" /> AI</TabsTrigger>
        <TabsTrigger value="appearance"><Palette className="h-4 w-4" /> Style</TabsTrigger>
      </TabsList>

      {/* Basic */}
      <TabsContent value="basic" className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Chatbot name <span className="text-destructive">*</span></Label>
          <Input id="name" value={data.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g., Support Bot, Sales Assistant" required minLength={2} maxLength={100} />
          <p className="text-xs text-muted-foreground">Shown to visitors in the chat header.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Input id="desc" value={data.description} onChange={(e) => onChange('description', e.target.value)} placeholder="What is this chatbot for? (optional)" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="welcome">Welcome message <span className="text-destructive">*</span></Label>
          <textarea id="welcome" value={data.welcomeMessage} onChange={(e) => onChange('welcomeMessage', e.target.value)} required rows={3} maxLength={500} className={textareaCls} />
          <p className="text-right text-xs text-muted-foreground">{(data.welcomeMessage || '').length}/500</p>
        </div>

        <ToggleRow
          title="Enable lead capture form"
          desc="Collect visitor name & email before chatting."
          checked={!!data.leadFormEnabled}
          onCheckedChange={(v) => onChange('leadFormEnabled', v)}
        />
        {showActive && (
          <ToggleRow
            title="Chatbot active"
            desc="Turn off to disable the bot without deleting it."
            checked={!!data.isActive}
            onCheckedChange={(v) => onChange('isActive', v)}
          />
        )}
      </TabsContent>

      {/* AI */}
      <TabsContent value="ai" className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="prompt">System prompt</Label>
          <textarea id="prompt" value={data.systemPrompt} onChange={(e) => onChange('systemPrompt', e.target.value)} rows={8} maxLength={5000} placeholder="Tell the AI how to behave…" className={cn(textareaCls, 'font-mono text-xs')} />
          <p className="text-right text-xs text-muted-foreground">{(data.systemPrompt || '').length}/5000 · Guides how your chatbot responds.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lang">Language</Label>
          <div className="relative">
            <select id="lang" value={data.language} onChange={(e) => onChange('language', e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-input bg-card px-3.5 pr-9 text-sm text-foreground shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </TabsContent>

      {/* Appearance */}
      <TabsContent value="appearance" className="space-y-5">
        <div className="space-y-2">
          <Label>Theme color</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            {SWATCHES.map((color) => (
              <button key={color} type="button" onClick={() => onChange('themeColor', color)}
                className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110',
                  data.themeColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-foreground/30 scale-110')}
                style={{ backgroundColor: color }} aria-label={color}>
                {data.themeColor === color && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
            <div className="ml-1 flex items-center gap-2">
              <input type="color" value={data.themeColor} onChange={(e) => onChange('themeColor', e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5" />
              <Input value={data.themeColor} onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange('themeColor', e.target.value); }} maxLength={7} className="h-9 w-28 font-mono text-sm" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Widget position</Label>
          <div className="grid grid-cols-2 gap-3">
            {[{ value: 'bottom-right', label: 'Bottom right', desc: 'Most common' }, { value: 'bottom-left', label: 'Bottom left', desc: 'Alternative' }].map((opt) => (
              <button key={opt.value} type="button" onClick={() => onChange('widgetPosition', opt.value)}
                className={cn('rounded-xl border-2 p-3 text-left transition-colors',
                  data.widgetPosition === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80')}>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function ToggleRow({ title, desc, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

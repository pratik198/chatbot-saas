/**
 * Markdown — a tiny, dependency-free renderer for chat messages.
 *
 * Supports the subset LLMs actually emit: fenced code blocks (with a copy
 * button + language label), inline `code`, **bold**, *italic*, [links](url),
 * bullet/numbered lists, and preserved line breaks. Content is rendered as
 * React text nodes (never dangerouslySetInnerHTML), so there's no XSS surface.
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

function renderInline(text, keyBase) {
  // token order matters: code first (so ** inside code isn't parsed)
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  const nodes = [];
  let last = 0; let m; let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      nodes.push(<code key={`${keyBase}-${i}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**')) {
      nodes.push(<strong key={`${keyBase}-${i}`} className="font-semibold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={`${keyBase}-${i}`}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      nodes.push(<a key={`${keyBase}-${i}`} href={mm[2]} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">{mm[1]}</a>);
    }
    last = pattern.lastIndex; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-[hsl(var(--muted))]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{lang || 'code'}</span>
        <button onClick={copy} className="inline-flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-foreground">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed"><code className="font-mono">{code}</code></pre>
    </div>
  );
}

function TextBlock({ text }) {
  // group lines into paragraphs and lists
  const lines = text.split('\n');
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push({ type: 'list', items: list }); list = null; } };

  lines.forEach((line) => {
    const bullet = /^\s*[-*]\s+(.*)/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)/.exec(line);
    if (bullet || numbered) {
      list ||= [];
      list.push((bullet || numbered)[1]);
    } else if (line.trim() === '') {
      flush();
    } else {
      flush();
      blocks.push({ type: 'p', text: line });
    }
  });
  flush();

  return blocks.map((b, i) => {
    if (b.type === 'list') {
      return (
        <ul key={i} className="my-1.5 ml-1 list-inside list-disc space-y-1">
          {b.items.map((it, j) => <li key={j}>{renderInline(it, `${i}-${j}`)}</li>)}
        </ul>
      );
    }
    return <p key={i} className="my-1 first:mt-0 last:mb-0">{renderInline(b.text, i)}</p>;
  });
}

export function Markdown({ content, className }) {
  const src = content ?? '';
  const parts = [];
  const fence = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0; let m;
  while ((m = fence.exec(src))) {
    if (m.index > last) parts.push({ type: 'text', value: src.slice(last, m.index) });
    parts.push({ type: 'code', lang: m[1], value: m[2].replace(/\n$/, '') });
    last = fence.lastIndex;
  }
  if (last < src.length) parts.push({ type: 'text', value: src.slice(last) });

  return (
    <div className={cn('text-sm leading-relaxed [word-break:break-word]', className)}>
      {parts.map((p, i) => p.type === 'code'
        ? <CodeBlock key={i} lang={p.lang} code={p.value} />
        : <TextBlock key={i} text={p.value} />)}
    </div>
  );
}

export default Markdown;

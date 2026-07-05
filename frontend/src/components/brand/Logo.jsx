/**
 * Lumina AI — brand mark.
 *
 * An original, abstract "twin-spark" glyph (a large luminous 4-point star with
 * a smaller companion) on an iOS-style squircle with the signature blue→indigo
 * →purple gradient. No robot/chat-bubble clichés. Reads cleanly at 16px
 * (favicon / sidebar) up to hero size.
 *
 * Props:
 *   size            tile edge in px (default 36)
 *   showWordmark    render "Lumina AI" text beside the mark
 *   glyphOnly       render the raw spark with no tile (for tight spots)
 *   className        wrapper classes
 */
import { cn } from '@/lib/utils';

function SparkGlyph({ className, style }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} fill="none" aria-hidden="true">
      {/* main spark */}
      <path
        d="M17 10 Q18.47 19.53 28 21 Q18.47 22.47 17 32 Q15.53 22.47 6 21 Q15.53 19.53 17 10 Z"
        fill="white"
      />
      {/* companion spark */}
      <path
        d="M29 6 Q29.67 10.33 34 11 Q29.67 11.67 29 16 Q28.33 11.67 24 11 Q28.33 10.33 29 6 Z"
        fill="white"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export default function Logo({
  size = 36,
  showWordmark = false,
  glyphOnly = false,
  className,
  wordmarkClassName,
}) {
  const tile = (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden shrink-0',
        'shadow-glow-sm ring-1 ring-white/10',
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)',
      }}
    >
      {/* top-light sheen */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.35), transparent 55%)',
        }}
      />
      <SparkGlyph className="relative" style={{ width: '72%', height: '72%' }} />
    </span>
  );

  if (glyphOnly) {
    return (
      <span className={cn('inline-flex', className)} style={{ width: size, height: size }}>
        <SparkGlyph className="w-full h-full" />
      </span>
    );
  }

  if (!showWordmark) return <span className={className}>{tile}</span>;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {tile}
      <span className={cn('font-bold tracking-tight leading-none', wordmarkClassName)}>
        <span className="text-foreground">Lumina</span>
        <span className="gradient-text"> AI</span>
      </span>
    </span>
  );
}

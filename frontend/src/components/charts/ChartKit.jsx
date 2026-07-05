/**
 * ChartKit — small helpers so Recharts matches the Lumina theme in both modes.
 *   useChartColors()  grid/axis/text colors that follow light/dark
 *   ChartTooltip      themed tooltip card
 *   GRADIENT          shared blue→purple palette for series
 */
import { useTheme } from '@/components/theme/ThemeProvider';

export const SERIES = ['#6366f1', '#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)',
    axis: dark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.9)',
    cursor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
  };
}

export function ChartTooltip({ active, payload, label, valueSuffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-elevated backdrop-blur">
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value?.toLocaleString?.() ?? entry.value}{valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * cn() — the single class-name helper used across every UI primitive.
 *
 * clsx      → conditionally joins class names ( cn('a', cond && 'b') )
 * twMerge   → resolves Tailwind conflicts so the LAST utility wins
 *             ( cn('px-2', 'px-4') → 'px-4', not 'px-2 px-4' )
 *
 * This is the same helper shadcn/ui ships with. Every component takes a
 * `className` prop and merges it through cn(), so callers can always
 * override styling without specificity fights.
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a number compactly: 1200 → "1.2k", 3400000 → "3.4M". */
export function formatCompact(n) {
  if (n == null || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Relative "time ago" string from an ISO date or Date. */
export function timeAgo(input) {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  const ranges = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  for (const [unit, secs] of ranges) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${unit[0]}${unit === 'month' ? 'o' : ''} ago`;
  }
  return 'just now';
}

/** Deterministic gradient pair from a string (for avatars / bot tiles). */
export function gradientFromString(str = '') {
  const palettes = [
    ['#6366f1', '#a855f7'], ['#3b82f6', '#06b6d4'], ['#8b5cf6', '#ec4899'],
    ['#0ea5e9', '#6366f1'], ['#f43f5e', '#f59e0b'], ['#10b981', '#3b82f6'],
    ['#a855f7', '#6366f1'], ['#f59e0b', '#ef4444'],
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

/** Initials from a name or email. */
export function initials(name = '', fallback = '?') {
  const clean = String(name).trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

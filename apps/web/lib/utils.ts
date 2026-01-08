import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Lot statuses
    NEW: 'bg-blue-100 text-blue-700',
    REVIEWING: 'bg-amber-100 text-amber-700',
    CONTACTED: 'bg-purple-100 text-purple-700',
    NEGOTIATING: 'bg-orange-100 text-orange-700',
    UNDER_CONTRACT: 'bg-green-100 text-green-700',
    DUE_DILIGENCE: 'bg-cyan-100 text-cyan-700',
    PURCHASED: 'bg-green-100 text-green-700',
    PASSED: 'bg-slate-100 text-slate-700',
    LOST: 'bg-red-100 text-red-700',
    // Build statuses
    PRE_CONSTRUCTION: 'bg-slate-100 text-slate-700',
    PERMITTING: 'bg-amber-100 text-amber-700',
    SITE_WORK: 'bg-orange-100 text-orange-700',
    FOUNDATION: 'bg-blue-100 text-blue-700',
    FRAMING: 'bg-purple-100 text-purple-700',
    ROUGH_INS: 'bg-cyan-100 text-cyan-700',
    INSULATION_DRYWALL: 'bg-indigo-100 text-indigo-700',
    FINISHES: 'bg-pink-100 text-pink-700',
    FINAL: 'bg-emerald-100 text-emerald-700',
    PUNCH_LIST: 'bg-yellow-100 text-yellow-700',
    COMPLETE: 'bg-green-100 text-green-700',
    SOLD: 'bg-green-100 text-green-700',
    // Task statuses
    NOT_STARTED: 'bg-slate-100 text-slate-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    BLOCKED: 'bg-red-100 text-red-700',
    SKIPPED: 'bg-slate-100 text-slate-700',
    // Default
    default: 'bg-slate-100 text-slate-700',
  };

  return colors[status] || colors.default;
}

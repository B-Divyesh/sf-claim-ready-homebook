import type { HomeItem } from './types';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'] as const;

export function money(value: number | null, currency = 'USD'): string {
  if (value === null || !Number.isFinite(value)) return 'Not recorded';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function missingEvidence(item: HomeItem): string[] {
  const missing: string[] = [];
  if (!item.photo && !item.receipt) missing.push('photo or receipt');
  if (item.value === null) missing.push('value');
  if (!item.purchaseDate) missing.push('purchase date');
  if (!item.serial) missing.push('serial/model');
  if (!item.room && !item.container) missing.push('location');
  return missing;
}

export function readiness(items: HomeItem[]): number {
  if (!items.length) return 0;
  const complete = items.reduce((sum, item) => sum + (5 - missingEvidence(item).length), 0);
  return Math.round((complete / (items.length * 5)) * 100);
}

export function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'homebook';
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

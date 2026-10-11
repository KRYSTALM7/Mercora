import { format, parseISO } from 'date-fns'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
}

export function formatPercent(value: number): string {
  return `${Math.round((value || 0) * 100)}%`
}

export function formatDate(value?: string | null, pattern: string = 'MMM d, yyyy'): string {
  if (!value) return '—'
  try {
    return format(parseISO(value), pattern)
  } catch {
    return value
  }
}

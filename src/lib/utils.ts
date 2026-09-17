import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const MEMBER_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
]

export function getRandomColor(): string {
  return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)]
}

export function validateSplitTotal(
  splits: { amount?: number; percentage?: number }[],
  total: number,
  type: 'equal' | 'exact' | 'percentage'
): { valid: boolean; error?: string } {
  if (type === 'equal') return { valid: true }

  if (type === 'exact') {
    const sum = splits.reduce((acc, s) => acc + (s.amount || 0), 0)
    if (Math.abs(sum - total) > 0.01) {
      return { valid: false, error: `Split amounts must sum to ${total}` }
    }
    return { valid: true }
  }

  if (type === 'percentage') {
    const sum = splits.reduce((acc, s) => acc + (s.percentage || 0), 0)
    if (Math.abs(sum - 100) > 0.01) {
      return { valid: false, error: 'Percentages must sum to 100%' }
    }
    return { valid: true }
  }

  return { valid: true }
}
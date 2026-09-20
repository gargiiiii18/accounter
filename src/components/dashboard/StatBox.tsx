import { cn } from '@/lib/utils'

interface StatBoxProps {
  label: string
  value: string
  tone?: 'neutral' | 'amber' | 'green' | 'red'
  className?: string
}

const TONE_CLASSES: Record<NonNullable<StatBoxProps['tone']>, string> = {
  neutral: 'bg-[#d0e2f4] border-[#b8d4eb]',
  amber: 'bg-amber-50 border-amber-300',
  green: 'bg-emerald-50 border-emerald-300',
  red: 'bg-red-50 border-red-300',
}

const LABEL_CLASSES: Record<NonNullable<StatBoxProps['tone']>, string> = {
  neutral: 'text-[#456073]',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
  red: 'text-red-500',
}

const VALUE_CLASSES: Record<NonNullable<StatBoxProps['tone']>, string> = {
  neutral: 'text-[#1a2332]',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
  red: 'text-red-500',
}

/**
 * Colored stat tile used in the Splitwise-style cards (dashboard SPENT/OWED/YOU
 * boxes, detail-page Total Spent/You're Owed/You Owe boxes). Light tints with
 * darker borders, small uppercase label, bold tabular amount.
 */
export function StatBox({ label, value, tone = 'neutral', className }: StatBoxProps) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 min-w-0 flex-1', TONE_CLASSES[tone], className)}>
      <p className={cn('text-[11px] font-semibold uppercase tracking-wide', LABEL_CLASSES[tone])}>
        {label}
      </p>
      <p className={cn('text-lg sm:text-xl font-bold tabular-nums whitespace-normal break-words mt-0.5', VALUE_CLASSES[tone])}>
        {value}
      </p>
    </div>
  )
}

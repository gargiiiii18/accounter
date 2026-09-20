'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Balance } from '@/lib/types'
import type { MemberMap } from './DetailPanels'
import { MemberAvatar } from './MemberAvatar'

const CATEGORY_META: { keywords: string[]; label: string; icon: string }[] = [
  { keywords: ['flight', 'travel', 'trip', 'taxi', 'uber', 'bus', 'train', 'plane', 'airport', 'hotel', 'stay'], label: 'Travel', icon: '✈️' },
  { keywords: ['food', 'dinner', 'lunch', 'breakfast', 'restaurant', 'tapas', 'meal', 'eat', 'pizza', 'coffee', 'drink', 'bar'], label: 'Food', icon: '🍽️' },
  { keywords: ['fun', 'movie', 'ticket', 'concert', 'game', 'party', 'museum', 'show', 'entertainment'], label: 'Fun', icon: '🎉' },
  { keywords: ['groc', 'shop', 'store', 'market'], label: 'Groceries', icon: '🛒' },
  { keywords: ['bill', 'rent', 'utilit', 'electric', 'water', 'gas', 'internet', 'phone'], label: 'Bills', icon: '🏠' },
]

export function categoryOf(description: string): string {
  const text = description.toLowerCase()
  const match = CATEGORY_META.find(c => c.keywords.some(k => text.includes(k)))
  return match?.label ?? 'Other'
}

function categoryIcon(label: string): string {
  return CATEGORY_META.find(c => c.label === label)?.icon ?? '🧾'
}

export function MembersCard({ balances, memberById }: { balances: Balance[]; memberById: MemberMap }) {
  return (
    <Card className="rounded-2xl border border-[#c0cdd9]/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {balances.map(balance => {
          const positive = balance.net >= 0
          return (
            <div key={balance.memberId} className="flex items-center gap-3">
              <MemberAvatar
                name={balance.memberName}
                color={memberById.get(balance.memberId)?.color}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1a2332] text-sm truncate">{balance.memberName}</p>
                <p className="text-xs text-[#7d96ad]">{positive ? 'is owed' : 'owes'}</p>
              </div>
              <span
                className={
                  positive
                    ? 'px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold tabular-nums shrink-0'
                    : 'px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-sm font-bold tabular-nums shrink-0'
                }
              >
                {positive ? '+' : '-'}{formatCurrency(Math.abs(balance.net))}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function CategoryCard({ categoryTotals }: { categoryTotals: Map<string, number> }) {
  const rows = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])
  if (rows.length === 0) return null
  return (
    <Card className="rounded-2xl border border-[#c0cdd9]/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">By Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {rows.map(([label, total]) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="text-lg leading-none" aria-hidden>{categoryIcon(label)}</span>
            <span className="text-sm text-[#456073]">{label}</span>
            <span className="ml-auto text-sm font-bold text-[#1a2332] tabular-nums">{formatCurrency(total)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

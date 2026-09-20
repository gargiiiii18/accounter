'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Expense, Settlement } from '@/lib/types'
import type { MemberMap } from './DetailPanels'

interface HistoryCardProps {
  groupExpenses: Expense[]
  groupSettlements: Settlement[]
  memberById: MemberMap
}

function splitTypeLabel(splitType: string): string {
  if (splitType === 'equal') return 'equal split'
  if (splitType === 'exact') return 'exact split'
  if (splitType === 'percentage') return 'percent split'
  return 'split'
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${month} ${day}, ${h}:${minutes} ${ampm}`
}

export function HistoryCard(props: HistoryCardProps) {
  const { groupExpenses, groupSettlements, memberById } = props
  const allTransactions = useMemo(() => {
    const list = [
      ...groupExpenses.map(e => ({ ...e, type: 'expense' as const })),
      ...groupSettlements.map(s => ({ ...s, type: 'settlement' as const })),
    ]
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [groupExpenses, groupSettlements])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">
          Activity Log · {allTransactions.length} event{allTransactions.length === 1 ? '' : 's'}
        </h3>
      </div>

      {allTransactions.length === 0 ? (
        <Card className="rounded-2xl border border-[#c0cdd9]/60">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-[#5a7089]">No activity yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-[#c0cdd9]/60 bg-white overflow-hidden">
          {allTransactions.map((tx, index) => (
            <div
              key={`${tx.type}-${tx.id}`}
              className={`flex items-start gap-3 p-4 ${index < allTransactions.length - 1 ? 'border-b border-[#eef3f9]' : ''}`}
            >
              {/* Blue dot indicator */}
              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#3b82f6] shrink-0" />

              <div className="flex-1 min-w-0">
                {/* Expense name or settlement description */}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-[#1a2332] truncate">
                    {tx.type === 'expense'
                      ? tx.description
                      : `${memberById.get(tx.fromMemberId)?.name} → ${memberById.get(tx.toMemberId)?.name}`}
                  </p>
                  <span className="font-bold text-sm text-[#1a2332] tabular-nums shrink-0">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>

                {/* Added badge + details */}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#3b82f6] text-white text-[10px] font-semibold uppercase tracking-wide">
                    Added
                  </span>
                  <span className="text-xs text-[#7d96ad]">
                    {formatCurrency(tx.amount)} · {tx.type === 'expense' ? splitTypeLabel(tx.splitType) : 'settlement'}
                  </span>
                </div>

                {/* Date */}
                <p className="mt-1 text-xs text-[#a3b5c7]">
                  {formatShortDate(tx.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

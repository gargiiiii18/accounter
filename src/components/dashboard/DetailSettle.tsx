'use client'

import { AlertTriangle, Handshake, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Settlement, SimplifiedDebt } from '@/lib/types'
import type { MemberMap } from './DetailPanels'
import { MemberAvatar } from './MemberAvatar'

export function RoundingNote({ leftover, onDismiss }: { leftover: number; onDismiss: () => void }) {
  return (
    <div className="relative flex items-start gap-2 p-3 pr-10 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        A leftover of {formatCurrency(leftover)} exists because the expenses could not be divided exactly evenly. It is considered settled.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 text-amber-600 hover:text-amber-700"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface DebtsCardProps {
  debts: SimplifiedDebt[]
  showRoundingNote: boolean
  roundingLeftover: number
  onDismissRounding: () => void
  memberById: MemberMap
  onRecordDebt: (debt: SimplifiedDebt) => void
}

export function DebtsCard(props: DebtsCardProps) {
  const { debts, showRoundingNote, roundingLeftover } = props
  const { onDismissRounding, memberById, onRecordDebt } = props

  if (debts.length === 0 && !showRoundingNote) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">Minimum Transactions</h3>
        </div>
        <Card className="rounded-2xl border border-[#c0cdd9]/60">
          <CardContent className="py-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-[#a3b5c7] mb-4" />
            <p className="text-[#5a7089] font-medium">All settled up!</p>
            <p className="text-xs text-[#7d96ad] mt-1">No payments needed</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">Minimum Transactions</h3>
        {debts.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-[#eef3f9] text-[#456073] text-xs font-semibold">
            {debts.length} payment{debts.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {showRoundingNote && (
        <RoundingNote leftover={roundingLeftover} onDismiss={onDismissRounding} />
      )}

      {debts.map((debt, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[#c0cdd9]/60 bg-white p-4 flex items-center gap-4"
        >
          {/* Payer avatar */}
          <MemberAvatar
            name={debt.fromName}
            color={memberById.get(debt.from)?.color}
            size="md"
          />
          {/* Payer pays Receiver + amount */}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#1a2332]">
              <span className="font-bold">{debt.fromName}</span>
              <span className="text-[#7d96ad]"> pays </span>
              <span className="font-bold">{debt.toName}</span>
            </p>
            <p className="text-lg font-bold text-[#1a2332] tabular-nums mt-0.5">
              {formatCurrency(debt.amount)}
            </p>
          </div>
          {/* Receiver avatar */}
          <MemberAvatar
            name={debt.toName}
            color={memberById.get(debt.to)?.color}
            size="md"
          />
          {/* Settle button */}
          <Button
            size="sm"
            className="rounded-xl h-9 px-4 font-semibold shrink-0"
            onClick={() => onRecordDebt(debt)}
          >
            Settle
          </Button>
        </div>
      ))}
    </div>
  )
}

interface SettlementsCardProps {
  groupSettlements: Settlement[]
  memberById: MemberMap
  onRecordCustom: () => void
  onDeleteSettlement: (id: string) => void
}

export function SettlementsCard(props: SettlementsCardProps) {
  const { groupSettlements, memberById, onRecordCustom } = props
  const { onDeleteSettlement } = props
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">Recorded Settlements</h3>
        <Button size="sm" className="rounded-xl h-8" onClick={onRecordCustom}>
          <Handshake className="h-3.5 w-3.5 mr-1.5" />
          Record Settlement
        </Button>
      </div>
      {groupSettlements.length === 0 ? (
        <Card className="text-center py-10 rounded-2xl border border-[#c0cdd9]/60">
          <CardContent>
            <Handshake className="h-10 w-10 mx-auto text-[#a3b5c7] mb-4" />
            <p className="text-sm text-[#5a7089]">No settlements recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        groupSettlements.map(settlement => (
          <div
            key={settlement.id}
            className="rounded-2xl border border-[#c0cdd9]/60 bg-white p-4 flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Handshake className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-[#1a2332] truncate">
                {memberById.get(settlement.fromMemberId)?.name} → {memberById.get(settlement.toMemberId)?.name}
              </p>
              <p className="text-xs text-[#7d96ad]">{formatDateTime(settlement.date)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-sm text-emerald-600 tabular-nums">{formatCurrency(settlement.amount)}</span>
              {settlement.note && <span className="text-xs text-[#7d96ad] hidden sm:inline">{settlement.note}</span>}
              <Button variant="ghost" size="icon" onClick={() => onDeleteSettlement(settlement.id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

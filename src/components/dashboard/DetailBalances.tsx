'use client'

import { UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Balance } from '@/lib/types'
import type { MemberMap } from './DetailPanels'
import { MemberAvatar } from './MemberAvatar'

interface BalancesCardProps {
  balances: Balance[]
  memberById: MemberMap
  canRemove: (memberId: string) => boolean
  onRemove: (memberId: string) => void
  onAddMember: () => void
  personalNoteCount: number
}

export function BalancesCard(props: BalancesCardProps) {
  const { balances, memberById, canRemove, onRemove, onAddMember, personalNoteCount } = props

  const maxAbsNet = Math.max(1, ...balances.map(b => Math.abs(b.net)))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d96ad]">Balances</h3>
        <Button variant="ghost" size="sm" onClick={onAddMember} className="h-8 rounded-lg text-[#3b82f6] text-xs">
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          Add Member
        </Button>
      </div>

      {balances.map(balance => {
        const positive = balance.net >= 0
        const barWidth = Math.abs(balance.net) === 0 ? 0 : Math.max(4, (Math.abs(balance.net) / maxAbsNet) * 100)
        return (
          <div
            key={balance.memberId}
            className="rounded-2xl border border-[#c0cdd9]/60 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <MemberAvatar
                name={balance.memberName}
                color={memberById.get(balance.memberId)?.color}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#1a2332]">{balance.memberName}</p>
                <p className="text-xs text-[#7d96ad]">
                  {positive ? 'is owed money' : 'owes money'}
                </p>
              </div>
              <span
                className={
                  positive
                    ? 'px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold tabular-nums shrink-0'
                    : 'px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-sm font-bold tabular-nums shrink-0'
                }
              >
                {positive ? '+' : '-'}{formatCurrency(Math.abs(balance.net))}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 rounded-full bg-[#eef3f9] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${positive ? 'bg-emerald-400' : 'bg-red-400'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            {/* Remove button */}
            <div className="mt-2">
              <button
                type="button"
                disabled={!canRemove(balance.memberId)}
                onClick={() => onRemove(balance.memberId)}
                title={canRemove(balance.memberId) ? 'Remove member' : 'Cannot remove: member has unsettled balance'}
                className={
                  canRemove(balance.memberId)
                    ? 'text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1'
                    : 'text-xs text-[#a3b5c7] cursor-not-allowed inline-flex items-center gap-1'
                }
              >
                <Trash2 className="h-3 w-3" />Remove
              </button>
            </div>
          </div>
        )
      })}

      {personalNoteCount > 0 && (
        <p className="text-xs text-[#7d96ad]">
          {personalNoteCount} personal payment{personalNoteCount === 1 ? '' : 's'} still on record.
        </p>
      )}
    </div>
  )
}

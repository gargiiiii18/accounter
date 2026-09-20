'use client'

import { Plus, Receipt, Search, ChevronDown, Edit, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isPersonalExpense } from '@/lib/balance'
import type { Expense, Member } from '@/lib/types'
import { MemberAvatar } from './MemberAvatar'
import { CategoryIcon } from './CategoryIcon'

export type MemberMap = Map<string, Member>

export function splitLabel(splitType: Expense['splitType']): string {
  if (splitType === 'equal') return 'Equal'
  if (splitType === 'exact') return 'Exact'
  return 'Percent'
}

const SPLIT_BADGE_CLASSES: Record<string, string> = {
  equal: 'bg-blue-100 text-blue-700',
  exact: 'bg-violet-100 text-violet-700',
  percentage: 'bg-amber-100 text-amber-700',
}

interface ExpenseRowProps {
  expense: Expense
  payer?: Member
  isOpen: boolean
  onToggle: () => void
  memberById: MemberMap
  settledUp: boolean
  onMarkDone: (id: string) => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

function ExpenseRow(props: ExpenseRowProps) {
  const { expense, payer, isOpen, onToggle, memberById } = props
  const { settledUp, onMarkDone, onEdit, onDelete } = props
  return (
    <Card className={`rounded-2xl border border-[#c0cdd9]/60 ${expense.archivedAt ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 text-left"
          aria-expanded={isOpen}
        >
          <CategoryIcon description={expense.description} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[#1a2332] text-sm truncate">{expense.description}</span>
              {expense.archivedAt && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dce5ed] text-[#456073] shrink-0">Cleared</span>
              )}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5a7089]">
              {payer && <MemberAvatar name={payer.name} color={payer.color} size="xs" />}
              <span>{payer?.name || 'Unknown'} paid</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{formatDate(expense.date)}</span>
              <span aria-hidden>·</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${SPLIT_BADGE_CLASSES[expense.splitType] || 'bg-[#dce5ed] text-[#456073]'}`}>
                {splitLabel(expense.splitType)}
              </span>
            </span>
          </span>
          <span className="font-bold text-sm sm:text-base text-[#1a2332] tabular-nums shrink-0">
            {formatCurrency(expense.amount)}
          </span>
          <ChevronDown className={`h-4 w-4 text-[#7d96ad] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ExpenseExpanded
            expense={expense}
            memberById={memberById}
            settledUp={settledUp}
            onMarkDone={onMarkDone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ExpenseExpanded(props: {
  expense: Expense
  memberById: MemberMap
  settledUp: boolean
  onMarkDone: (id: string) => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}) {
  const { expense, memberById, settledUp, onMarkDone, onEdit, onDelete } = props
  return (
    <div className="mt-4 pt-4 border-t border-[#c0cdd9]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#7d96ad] mb-2">Split details</p>
      <div className="space-y-1.5">
        {expense.splits.map(split => {
          const member = memberById.get(split.memberId)
          return (
            <div key={split.memberId} className="flex items-center gap-2 text-sm">
              {member && <MemberAvatar name={member.name} color={member.color} size="xs" />}
              <span className="text-[#1a2332]">{member?.name || 'Unknown'}</span>
              <span className="ml-auto tabular-nums text-[#456073]">{formatCurrency(split.amount)}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {settledUp && isPersonalExpense(expense) && !expense.archivedAt && (
          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => onMarkDone(expense.id)}>
            <Check className="h-4 w-4 mr-1" />Mark as done
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[#456073]" onClick={() => onEdit(expense)}>
          <Edit className="h-4 w-4 mr-1" />Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-red-500 hover:text-red-700" onClick={() => onDelete(expense.id)}>
          <Trash2 className="h-4 w-4 mr-1" />Delete
        </Button>
      </div>
    </div>
  )
}

interface ExpenseListProps {
  expenses: Expense[]
  totalCount: number
  search: string
  onSearch: (value: string) => void
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  memberById: MemberMap
  settledUp: boolean
  onMarkDone: (id: string) => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export function ExpenseListCard(props: ExpenseListProps) {
  const { expenses, totalCount, search, onSearch } = props
  const { expanded, onToggleExpand, memberById } = props
  const { settledUp, onMarkDone, onEdit, onDelete, onAdd } = props
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d96ad] pointer-events-none" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search expenses..."
          className="w-full h-11 rounded-xl border border-[#c0cdd9] bg-white pl-11 pr-4 text-sm text-[#1a2332] placeholder:text-[#7d96ad] shadow-sm outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
        />
      </div>
      {expenses.length === 0 ? (
        <Card className="text-center py-12 rounded-2xl border border-[#c0cdd9]/60">
          <CardContent>
            <Receipt className="h-12 w-12 mx-auto text-[#a3b5c7] mb-6" />
            <h3 className="text-lg font-semibold mb-3 text-[#1a2332]">
              {totalCount === 0 ? 'No expenses yet' : 'No expenses match'}
            </h3>
            <p className="text-[#5a7089] mb-6">
              {totalCount === 0 ? 'Add your first expense' : 'Try a different search'}
            </p>
            {totalCount === 0 && (
              <Button onClick={onAdd} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        expenses.map(expense => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            payer={memberById.get(expense.paidBy)}
            isOpen={expanded.has(expense.id)}
            onToggle={() => onToggleExpand(expense.id)}
            memberById={memberById}
            settledUp={settledUp}
            onMarkDone={onMarkDone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  )
}

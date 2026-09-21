'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isPersonalExpense } from '@/lib/balance'
import { exportGroupSummaryPdf } from '@/lib/exportPdf'
import { useApp } from '@/hooks/useApp'
import type { Expense, Member, SimplifiedDebt } from '@/lib/types'
import type { ExpenseFormData, SettlementFormData } from '@/lib/validation'
import { ExpenseListCard } from './DetailPanels'
import { HistoryCard } from './DetailHistory'
import { DebtsCard, SettlementsCard } from './DetailSettle'
import { BalancesCard } from './DetailBalances'
import { DetailShell, DetailTab } from './DetailShell'
import { DetailDialogs } from './DetailDialogs'
import { MembersCard } from './DetailSidebar'

export function GroupDetail({ groupId }: { groupId: string }) {
  const { state, loadGroupData, updateGroup, removeGroupMember, createExpense, deleteExpense, createSettlement, deleteSettlement, updateExpense, getGroupSummary } = useApp()
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)
  const [newSettlementOpen, setNewSettlementOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null)
  const [newMemberOpen, setNewMemberOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editGroupOpen, setEditGroupOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('expenses')
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set())

  const { currentGroup, expenses, settlements, balances, debts } = state
  const summary = currentGroup ? getGroupSummary(currentGroup) : null

  useEffect(() => {
    loadGroupData(groupId)
  }, [groupId, loadGroupData])

  const groupExpenses = useMemo(() =>
    expenses.filter(e => e.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses, groupId]
  )

  const groupSettlements = useMemo(() =>
    settlements.filter(s => s.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [settlements, groupId]
  )

  const handleCreateExpense = async (data: ExpenseFormData) => {
    await createExpense({
      ...data,
      splits: data.splits.map(s => ({
        memberId: s.memberId,
        amount: s.amount ?? 0,
        percentage: s.percentage,
      })),
    })
    setNewExpenseOpen(false)
    setEditingExpense(null)
  }

  const handleCreateSettlement = async (data: SettlementFormData) => {
    await createSettlement(data)
    setNewSettlementOpen(false)
    setSelectedDebt(null)
  }

  const handleAddMember = async (name: string, email?: string) => {
    if (!name.trim() || !currentGroup) return
    const newMember: Member = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      email: email?.trim(),
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      createdAt: new Date().toISOString(),
    }
    const updatedMembers = [...currentGroup.members, newMember]
    await updateGroup(groupId, { members: updatedMembers })
    setNewMemberOpen(false)
  }

  const canRemoveMember = (memberId: string): boolean => {
    const balance = balances.find(b => b.memberId === memberId)
    if (!balance) return true
    return Math.abs(balance.net) <= 0.01
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentGroup || !canRemoveMember(memberId)) return
    const memberName = currentGroup.members.find(m => m.id === memberId)?.name
    if (confirm(`Remove ${memberName} from this group?`)) {
      await removeGroupMember(groupId, memberId)
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setNewExpenseOpen(true)
  }

  const handleEditGroup = async (data: { name: string; description?: string; members: { name: string; email?: string | null }[] }) => {
    if (!currentGroup) return
    await updateGroup(currentGroup.id, {
      name: data.name,
      description: data.description,
      members: data.members,
    })
    setEditGroupOpen(false)
  }


  const handleExport = async () => {
    if (!currentGroup || !summary) return
    try {
      await exportGroupSummaryPdf({
        group: currentGroup,
        expenses: groupExpenses,
        settlements: groupSettlements,
        balances,
        debts,
        totals: {
          totalExpenses: summary.totalExpenses,
          totalSettled: summary.totalSettled,
          unsettled: summary.unsettledAmount,
        },
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export PDF')
    }
  }

  const settledUp = balances.length > 0 && balances.every(b => Math.abs(b.net) <= 0.01)
  const roundingLeftover = settledUp ? balances.reduce((max, b) => Math.max(max, Math.abs(b.net)), 0) : 0
  const hasRoundingLeftover = roundingLeftover > 0

  const [dismissedLeftover, setDismissedLeftover] = useState<number | null>(null)
  const showRoundingNote = hasRoundingLeftover && dismissedLeftover !== roundingLeftover

  useEffect(() => {
    if (!hasRoundingLeftover) return
    const timer = setTimeout(() => setDismissedLeftover(roundingLeftover), 8000)
    return () => clearTimeout(timer)
  }, [hasRoundingLeftover, roundingLeftover])

  const memberById = useMemo(() => new Map(currentGroup?.members.map(m => [m.id, m]) ?? []), [currentGroup?.members])

  const you = currentGroup?.members[0]
  const yourBalance = you ? balances.find(b => b.memberId === you.id) : null
  const youreOwed = yourBalance && yourBalance.net > 0 ? yourBalance.net : 0
  const youOwe = yourBalance && yourBalance.net < 0 ? Math.abs(yourBalance.net) : 0

  if (state.loading || !currentGroup) {
    if (state.error && !currentGroup) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="text-sm text-red-500 font-medium">{state.error}</p>
          <p className="text-xs text-[#5a7089]">Check your internet connection and try again</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c0cdd9] border-t-[#3b82f6]" />
        <p className="text-sm text-[#5a7089]">Loading group...</p>
      </div>
    )
  }

  const totalSpent = summary?.totalExpenses || 0

  const sidebar = (
    <>
      <MembersCard balances={balances} memberById={memberById} />
      <button
        type="button"
        onClick={() => setNewExpenseOpen(true)}
        className="hidden lg:flex w-full rounded-xl border-2 border-dashed border-[#c0cdd9] bg-white hover:border-[#3b82f6] hover:bg-[#eef3f9] transition-colors py-4 text-[#5a7089] hover:text-[#3b82f6] text-sm font-semibold items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Expense
      </button>
    </>
  )

  return (
    <DetailShell
      group={currentGroup}
      groupId={groupId}
      totalSpent={totalSpent}
      youreOwed={youreOwed}
      youOwe={youOwe}
      expenseCount={groupExpenses.length}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddExpense={() => setNewExpenseOpen(true)}
      onAddMember={() => setNewMemberOpen(true)}
      onOpenSettings={() => setEditGroupOpen(true)}
      headerActions={
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl h-9">
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setNewMemberOpen(true)} className="rounded-xl h-9">
            Add Member
          </Button>
        </div>
      }
      sidebar={sidebar}
    >
      {activeTab === 'expenses' && (
        <ExpenseListCard
          expenses={groupExpenses.filter(e => e.description.toLowerCase().includes(expenseSearch.toLowerCase()))}
          totalCount={groupExpenses.length}
          search={expenseSearch}
          onSearch={setExpenseSearch}
          expanded={expandedExpenses}
          onToggleExpand={(id) => setExpandedExpenses(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })}
          memberById={memberById}
          settledUp={settledUp}
          onMarkDone={(id) => updateExpense(id, { archivedAt: new Date().toISOString() })}
          onEdit={handleEditExpense}
          onDelete={deleteExpense}
          onAdd={() => setNewExpenseOpen(true)}
        />
      )}

      {activeTab === 'balances' && (
        <BalancesCard
          balances={balances}
          memberById={memberById}
          canRemove={canRemoveMember}
          onRemove={handleRemoveMember}
          onAddMember={() => setNewMemberOpen(true)}
          personalNoteCount={groupExpenses.filter(e => !e.archivedAt && isPersonalExpense(e)).length}
        />
      )}

      {activeTab === 'settle' && (
        <div className="space-y-6">
          <DebtsCard
            debts={debts}
            showRoundingNote={showRoundingNote}
            roundingLeftover={roundingLeftover}
            onDismissRounding={() => setDismissedLeftover(roundingLeftover)}
            memberById={memberById}
            onRecordDebt={(debt) => { setSelectedDebt(debt); setNewSettlementOpen(true) }}
          />
          <SettlementsCard
            groupSettlements={groupSettlements}
            memberById={memberById}
            onRecordCustom={() => { setSelectedDebt(null); setNewSettlementOpen(true) }}
            onDeleteSettlement={deleteSettlement}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <HistoryCard
          groupExpenses={groupExpenses}
          groupSettlements={groupSettlements}
          memberById={memberById}
        />
      )}

      <DetailDialogs
        group={currentGroup}
        groupId={groupId}
        newExpenseOpen={newExpenseOpen}
        onExpenseOpenChange={setNewExpenseOpen}
        editingExpense={editingExpense}
        onSubmitExpense={handleCreateExpense}
        onCancelExpense={() => { setNewExpenseOpen(false); setEditingExpense(null) }}
        newSettlementOpen={newSettlementOpen}
        onSettlementOpenChange={setNewSettlementOpen}
        selectedDebt={selectedDebt}
        debts={debts}
        onSubmitSettlement={handleCreateSettlement}
        onCancelSettlement={() => { setNewSettlementOpen(false); setSelectedDebt(null) }}
        newMemberOpen={newMemberOpen}
        onMemberOpenChange={setNewMemberOpen}
        onAddMember={handleAddMember}
        editGroupOpen={editGroupOpen}
        onEditGroupOpenChange={setEditGroupOpen}
        onSubmitGroupEdit={handleEditGroup}
      />
    </DetailShell>
  )
}

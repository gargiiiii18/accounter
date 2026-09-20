'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, DollarSign, Users, Receipt, Handshake, History, ChevronRight, Edit, Trash2, Download, Upload, ArrowUpDown, UserPlus, AlertTriangle, X, Check } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { isPersonalExpense } from '@/lib/balance'
import { exportGroupSummaryPdf } from '@/lib/exportPdf'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { SettlementForm } from '@/components/forms/SettlementForm'
import { useApp } from '@/hooks/useApp'
import type { Group, Expense, Settlement, Member, SimplifiedDebt } from '@/lib/types'
import type { ExpenseFormData, SettlementFormData } from '@/lib/validation'

export function GroupDetail({ groupId }: { groupId: string }) {
  const { state, loadGroupData, updateGroup, removeGroupMember, createExpense, deleteExpense, createSettlement, deleteSettlement, updateExpense, getGroupSummary } = useApp()
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)
  const [newSettlementOpen, setNewSettlementOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null)
  const [newMemberOpen, setNewMemberOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'settlements' | 'history'>('overview')

  const { currentGroup, expenses, settlements, balances, debts } = state
  const summary = currentGroup ? getGroupSummary(currentGroup) : null

  useEffect(() => {
    loadGroupData(groupId)
  }, [groupId, loadGroupData])

  const groupExpenses = expenses.filter(e => e.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const groupSettlements = settlements.filter(s => s.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

  // Everyone is considered settled once every net balance is within a 0.01
  // rounding tolerance. A leftover cent can exist because expenses cannot
  // always be divided exactly evenly; it is treated as settled.
  const settledUp = balances.length > 0 && balances.every(b => Math.abs(b.net) <= 0.01)
  const roundingLeftover = settledUp ? balances.reduce((max, b) => Math.max(max, Math.abs(b.net)), 0) : 0
  const hasRoundingLeftover = roundingLeftover > 0

  // The rounding notice shows only in the Simplified Settlements pane. It
  // auto-dismisses after 8 seconds, can be closed manually, and reappears
  // whenever a (different) leftover shows up.
  const [dismissedLeftover, setDismissedLeftover] = useState<number | null>(null)
  const showRoundingNote = hasRoundingLeftover && dismissedLeftover !== roundingLeftover

  useEffect(() => {
    if (!hasRoundingLeftover) return
    const timer = setTimeout(() => setDismissedLeftover(roundingLeftover), 8000)
    return () => clearTimeout(timer)
  }, [hasRoundingLeftover, roundingLeftover])

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

  if (state.loading || !currentGroup) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        <p className="text-sm text-zinc-500">Loading group...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-5 sm:gap-8">
      <div className="flex-shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{currentGroup.name}</h1>
            <p className="text-zinc-500">{currentGroup.members.length} members · {formatCurrency(summary?.totalExpenses || 0)} total expenses</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setNewExpenseOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setNewMemberOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'expenses' | 'balances' | 'settlements' | 'history')} className="w-full">
          <TabsList className="sticky top-0 z-20 flex w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums">{formatCurrency(summary?.totalExpenses || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Total Settled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">{formatCurrency(summary?.totalSettled || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Unsettled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-red-600 tabular-nums">{formatCurrency(summary?.unsettledAmount || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Who Owes Whom</CardTitle>
            </CardHeader>
            <CardContent>
              {debts.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">All settled up! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {debts.map((debt, index) => (
                    <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-zinc-200 bg-zinc-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: currentGroup.members.find(m => m.id === debt.from)?.color }}>
                          {debt.fromName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium truncate">{debt.fromName}</p>
                          <p className="text-sm text-zinc-500">owes</p>
                        </div>
                        <ArrowUpDown className="h-4 w-4 text-zinc-500 mx-1 shrink-0" />
                        <div className="text-right">
                          <p className="font-medium truncate">{debt.toName}</p>
                          <p className="text-sm text-zinc-500">is owed</p>
                        </div>
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: currentGroup.members.find(m => m.id === debt.to)?.color }}>
                          {debt.toName[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:block sm:text-right">
                        <p className="text-lg sm:text-xl font-bold text-red-600">${debt.amount.toFixed(2)}</p>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedDebt(debt); setNewSettlementOpen(true) }}>
                          Settle
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Members</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setNewMemberOpen(true)} className="h-8">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentGroup.members.map(member => {
                  const canRemove = canRemoveMember(member.id)
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: member.color }}>
                          {member.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          {member.email && <p className="text-xs text-zinc-500">{member.email}</p>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={!canRemove}
                        className={canRemove ? 'text-red-500 hover:text-red-700' : 'text-zinc-300 cursor-not-allowed'}
                        title={canRemove ? 'Remove member' : 'Cannot remove: member has unsettled balance'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {groupExpenses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Receipt className="h-12 w-12 mx-auto text-zinc-300 mb-6" />
                <h3 className="text-lg font-medium mb-3">No expenses yet</h3>
                <p className="text-zinc-500 mb-6">Add your first expense</p>
                <Button onClick={() => setNewExpenseOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {groupExpenses.map(expense => (
                <Card key={expense.id} className={expense.archivedAt ? 'opacity-60' : ''}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium">{expense.description}</p>{expense.archivedAt && (<span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">Cleared</span>)}</div>
                          <p className="text-sm text-zinc-500">{formatDate(expense.date)} · Paid by {currentGroup.members.find(m => m.id === expense.paidBy)?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg">{formatCurrency(expense.amount)}</span>{settledUp && isPersonalExpense(expense) && !expense.archivedAt && (<Button variant="outline" size="sm" className="h-8" onClick={() => updateExpense(expense.id, { archivedAt: new Date().toISOString() })} title="Record this payment as done - it stops counting toward balances but stays in history as proof"><Check className="h-4 w-4 mr-1" />Mark as done</Button>)}
                        <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Member Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-medium">Member</th>
                      <th className="text-right py-2 px-2 sm:py-3 sm:px-4 font-medium">Paid</th>
                      <th className="text-right py-2 px-2 sm:py-3 sm:px-4 font-medium">Owed</th>
                      <th className="text-right py-2 px-2 sm:py-3 sm:px-4 font-medium">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(balance => (
                      <tr key={balance.memberId} className="border-b border-zinc-100">
                        <td className="py-2 px-2 sm:py-3 sm:px-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: currentGroup.members.find(m => m.id === balance.memberId)?.color }}>
                              {balance.memberName[0].toUpperCase()}
                            </div>
                            <div className='md:px-2 px-1'>
                            {balance.memberName}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 sm:py-3 sm:px-4 text-emerald-600">{formatCurrency(balance.paid)}</td>
                        <td className="text-right py-2 px-2 sm:py-3 sm:px-4 text-red-600">{formatCurrency(balance.owed)}</td>
                        <td className={'text-right py-2 px-2 sm:py-3 sm:px-4 font-bold tabular-nums ' + (balance.net > 0 ? 'text-emerald-600' : balance.net < 0 ? 'text-red-600' : 'text-zinc-500')}>
                          {balance.net >= 0 ? '+' : ''}{formatCurrency(balance.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {settledUp && (() => {
                const activePersonal = groupExpenses.filter(e => !e.archivedAt && isPersonalExpense(e))
                if (activePersonal.length === 0) return null
                return (
                  <p className="mt-4 text-sm text-zinc-500">
                    {activePersonal.length} personal payment{activePersonal.length === 1 ? "" : "s"} still on record - mark it as done from the Expenses tab, or keep it as proof.
                  </p>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simplified Settlements</CardTitle>
            </CardHeader>
            <CardContent>
              {debts.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-center text-zinc-500 py-8">All settled up! 🎉</p>
                  {showRoundingNote && (
                    <div className="relative flex items-start gap-2 p-3 pr-10 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        A leftover of {formatCurrency(roundingLeftover)} exists because the expenses could not be divided exactly evenly. It is considered settled.
                      </span>
                      <button
                        type="button"
                        onClick={() => setDismissedLeftover(roundingLeftover)}
                        className="absolute top-2 right-2 text-amber-600 hover:text-amber-700"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {debts.map((debt, index) => (
                    <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border border-zinc-200 bg-zinc-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: currentGroup.members.find(m => m.id === debt.from)?.color }}>
                          {debt.fromName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium truncate">{debt.fromName}</p>
                          <p className="text-sm text-zinc-500">pays</p>
                        </div>
                        <ArrowUpDown className="h-4 w-4 text-zinc-500 mx-1 shrink-0" />
                        <div className="text-right">
                          <p className="font-medium truncate">{debt.toName}</p>
                          <p className="text-sm text-zinc-500">receives</p>
                        </div>
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: currentGroup.members.find(m => m.id === debt.to)?.color }}>
                          {debt.toName[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:block sm:text-right">
                        <p className="text-lg sm:text-xl font-bold text-red-600">${debt.amount.toFixed(2)}</p>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedDebt(debt); setNewSettlementOpen(true) }}>
                          Record
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-6">
          <div className="flex justify-end mb-6">
            <Button onClick={() => { setSelectedDebt(null); setNewSettlementOpen(true) }}>
              <Handshake className="h-4 w-4 mr-2" />
              Record Settlement
            </Button>
          </div>
          {groupSettlements.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Handshake className="h-12 w-12 mx-auto text-zinc-300 mb-6" />
                <h3 className="text-lg font-medium mb-3">No settlements yet</h3>
                <p className="text-zinc-500 mb-6">Record when someone pays back</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {groupSettlements.map(settlement => (
                <Card key={settlement.id}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Handshake className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {currentGroup.members.find(m => m.id === settlement.fromMemberId)?.name} → {currentGroup.members.find(m => m.id === settlement.toMemberId)?.name}
                          </p>
                          <p className="text-sm text-zinc-500">{formatDateTime(settlement.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg text-emerald-600">{formatCurrency(settlement.amount)}</span>
                        {settlement.note && <span className="text-sm text-zinc-500">{settlement.note}</span>}
                        <Button variant="ghost" size="icon" onClick={() => deleteSettlement(settlement.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const allTransactions = [
                  ...groupExpenses.map(e => ({ ...e, type: 'expense' as const, date: e.date })),
                  ...groupSettlements.map(s => ({ ...s, type: 'settlement' as const, date: s.date })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                if (allTransactions.length === 0) {
                  return <p className="text-center text-zinc-500 py-8">No transactions yet</p>
                }

                return (
                  <div className="space-y-2">
                    {allTransactions.map((tx, index) => (
                      <div key={`${tx.type}-${tx.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-zinc-200 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'expense' ? 'bg-zinc-100' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {tx.type === 'expense' ? <DollarSign className="h-4 w-4 text-zinc-500" /> : <Handshake className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <div>
                            <p className="font-medium">{tx.type === 'expense' ? tx.description : `${currentGroup.members.find(m => m.id === tx.fromMemberId)?.name} → ${currentGroup.members.find(m => m.id === tx.toMemberId)?.name}`}{tx.archivedAt && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">Cleared</span>}</p>
                            <p className="text-sm text-zinc-500">{formatDateTime(tx.date)}</p>
                          </div>
                        </div>
                        <span className={`font-medium ${tx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
        <div className="pb-8" />
      </div>

      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>Split costs among group members</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            groupId={groupId}
            members={currentGroup.members}
            initialData={editingExpense || undefined}
            onSubmit={handleCreateExpense}
            onCancel={() => { setNewExpenseOpen(false); setEditingExpense(null); }}
            isEditing={!!editingExpense}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={newSettlementOpen}
        onOpenChange={(open) => {
          setNewSettlementOpen(open)
          if (!open) setSelectedDebt(null)
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Settlement</DialogTitle>
            <DialogDescription>Record when someone pays back</DialogDescription>
          </DialogHeader>
          <SettlementForm
            groupId={groupId}
            members={currentGroup.members}
            debts={selectedDebt ? [selectedDebt] : debts}
            initialFrom={selectedDebt?.from}
            initialTo={selectedDebt?.to}
            initialAmount={selectedDebt?.amount}
            onSubmit={handleCreateSettlement}
            onCancel={() => { setNewSettlementOpen(false); setSelectedDebt(null) }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={newMemberOpen} onOpenChange={setNewMemberOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add a new member to this group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name</Label>
              <Input
                id="memberName"
                placeholder="Enter member name"
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email (optional)</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="Enter email"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setNewMemberOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const nameInput = document.getElementById('memberName') as HTMLInputElement
                const emailInput = document.getElementById('memberEmail') as HTMLInputElement
                handleAddMember(nameInput?.value || '', emailInput?.value || '')
              }}
              className="w-full sm:w-auto"
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


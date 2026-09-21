'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Users, ArrowRight, Edit, Trash2, WifiOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { calculateBalances } from '@/lib/balance'
import { GroupForm } from '@/components/forms/GroupForm'
import { useApp } from '@/hooks/useApp'
import type { Group, GroupSummary } from '@/lib/types'
import { MemberAvatarStack } from './MemberAvatar'
import { StatBox } from './StatBox'

export function GroupsDashboard() {
  const { state, createGroup, updateGroup, deleteGroup, getGroupSummary, loadAllGroupsData } = useApp()
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadAllGroupsData()
  }, [loadAllGroupsData])

  const summaries = state.groups.map(getGroupSummary)

  const figuresByGroup = useMemo(() => {
    const map = new Map<string, { spent: number; owed: number; you: number }>()
    for (const summary of summaries) {
      const groupExpenses = state.expenses.filter(e => e.groupId === summary.group.id)
      const groupSettlements = state.settlements.filter(s => s.groupId === summary.group.id)
      const balances = calculateBalances(groupExpenses, summary.group.members, groupSettlements)
      const spent = summary.totalExpenses
      const owed = balances.reduce((sum, b) => sum + Math.max(0, -b.net), 0)
      const you = Math.max(0, ...balances.map(b => b.net))
      map.set(summary.group.id, { spent, owed, you })
    }
    return map
  }, [summaries, state.expenses, state.settlements])

  const visibleSummaries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return summaries
    return summaries.filter(
      s =>
        s.group.name.toLowerCase().includes(q) ||
        (s.group.description || '').toLowerCase().includes(q) ||
        s.group.members.some(m => m.name.toLowerCase().includes(q))
    )
  }, [summaries, search])

  const totalTracked = useMemo(() => {
    return summaries.reduce((sum, s) => sum + s.totalExpenses, 0)
  }, [summaries])

  const handleCreateGroup = async (data: { name: string; description?: string; members: { name: string; email?: string | null }[] }) => {
    await createGroup({
      name: data.name,
      description: data.description,
      members: data.members,
    })
    setNewGroupOpen(false)
  }

  const handleEditGroup = async (data: { name: string; description?: string; members: { name: string; email?: string | null }[] }) => {
    if (!editingGroup) return
    await updateGroup(editingGroup.id, {
      name: data.name,
      description: data.description,
      members: data.members,
    })
    setEditingGroup(null)
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? This permanently removes the group and all of its expenses and settlements from the database.')) return
    try {
      await deleteGroup(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete group')
    }
  }

  if (state.loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#3b82f6]">Your Groups</h1>
          <p className="text-[#3b82f6]/70 mt-2">Select a group to view expenses and balances</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-20" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c0cdd9] border-t-[#3b82f6]" />
          <p className="text-sm text-[#3b82f6]/70">Loading your groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="py-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#3b82f6]">Your Groups</h1>
          <p className="text-[#3b82f6]/70 mt-2">Select a group to view expenses and balances</p>
        </div>
        {state.groups.length > 0 && (
          <p className="text-sm text-[#3b82f6]/70">
            {state.groups.length} group{state.groups.length === 1 ? '' : 's'} · {formatCurrency(totalTracked)} tracked
          </p>
        )}
      </div>

      {state.groups.length > 0 && (
        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d96ad] pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups or members..."
            className="w-full h-12 rounded-xl border border-[#c0cdd9] bg-white pl-11 pr-4 text-sm text-[#1a2332] placeholder:text-[#7d96ad] shadow-sm outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
          />
        </div>
      )}

      <DashboardList
        groupsEmpty={state.groups.length === 0}
        error={state.error}
        search={search}
        clearSearch={() => setSearch('')}
        summaries={visibleSummaries}
        figuresByGroup={figuresByGroup}
        onNewGroup={() => setNewGroupOpen(true)}
        onEditGroup={setEditingGroup}
        onDeleteGroup={handleDeleteGroup}
      />
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <GroupForm onSubmit={handleCreateGroup} onCancel={() => setNewGroupOpen(false)} />
        </DialogContent>
      </Dialog>
      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={open => !open && setEditingGroup(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
            </DialogHeader>
            <GroupForm
              initialData={{ name: editingGroup.name, description: editingGroup.description, members: editingGroup.members }}
              onSubmit={handleEditGroup}
              onCancel={() => setEditingGroup(null)}
              isEditing
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function DashboardList(props: {
  groupsEmpty: boolean
  error: string | null
  search: string
  clearSearch: () => void
  summaries: GroupSummary[]
  figuresByGroup: Map<string, { spent: number; owed: number; you: number }>
  onNewGroup: () => void
  onEditGroup: (group: Group) => void
  onDeleteGroup: (id: string) => void
}) {
  const { groupsEmpty, error, clearSearch, summaries } = props
  const { figuresByGroup, onNewGroup, onEditGroup, onDeleteGroup } = props
  if (error && groupsEmpty) {
    return (
      <Card className="text-center py-16 rounded-2xl">
        <CardContent className="pt-6">
          <WifiOff className="h-14 w-14 mx-auto text-[#a3b5c7] mb-5" />
          <h3 className="text-xl font-semibold mb-2 text-[#1a2332]">Unable to load groups</h3>
          <p className="text-[#5a7089] mb-8">Check your internet connection and try again</p>
          <Button variant="outline" onClick={() => window.location.reload()} size="lg" className="rounded-xl">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (groupsEmpty) {
    return (
      <Card className="text-center py-16 rounded-2xl">
        <CardContent className="pt-6">
          <Users className="h-14 w-14 mx-auto text-[#a3b5c7] mb-5" />
          <h3 className="text-xl font-semibold mb-2 text-[#1a2332]">No groups yet</h3>
          <p className="text-[#5a7089] mb-8">Create your first group to start tracking shared expenses</p>
          <Button onClick={onNewGroup} size="lg" className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Group
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (summaries.length === 0) {
    return (
      <Card className="text-center py-16 rounded-2xl">
        <CardContent className="pt-6">
          <Search className="h-14 w-14 mx-auto text-[#a3b5c7] mb-5" />
          <h3 className="text-xl font-semibold mb-2 text-[#1a2332]">No groups match</h3>
          <p className="text-[#5a7089] mb-8">Try a different group name or member</p>
          <Button variant="outline" onClick={clearSearch} size="lg" className="rounded-xl">
            Clear search
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map(summary => (
        <DashboardCard
          key={summary.group.id}
          summary={summary}
          figures={figuresByGroup.get(summary.group.id) ?? {
            spent: summary.totalExpenses,
            owed: summary.unsettledAmount,
            you: 0,
          }}
          onEditGroup={onEditGroup}
          onDeleteGroup={onDeleteGroup}
        />
      ))}
      <button
        type="button"
        onClick={onNewGroup}
        className="rounded-2xl border-2 border-dashed border-[#a3b5c7] bg-white/60 hover:bg-white hover:border-[#3b82f6] transition-colors min-h-[220px] flex flex-col items-center justify-center gap-3 text-[#5a7089] hover:text-[#3b82f6] p-6"
      >
        <span className="text-4xl font-light leading-none">+</span>
        <span className="text-base font-semibold">New Group</span>
      </button>
    </div>
  )
}

function DashboardCard(props: {
  summary: GroupSummary
  figures: { spent: number; owed: number; you: number }
  onEditGroup: (group: Group) => void
  onDeleteGroup: (id: string) => void
}) {
  const { summary, figures, onEditGroup, onDeleteGroup } = props
  return (
    <Link href={`/groups/${summary.group.id}`} className="block group">
      <Card className="rounded-2xl hover:shadow-lg transition-all h-full border border-[#c0cdd9]/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="h-10 w-10 rounded-xl bg-[#eef3f9] flex items-center justify-center text-sm font-extrabold tracking-wide text-[#1a2332] shrink-0">
              {summary.group.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#5a7089] hover:text-[#1a2332]"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditGroup(summary.group) }}
                title="Edit group"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGroup(summary.group.id) }}
                title="Delete group"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ArrowRight className="h-4 w-4 text-[#a3b5c7] group-hover:text-[#3b82f6] transition-colors ml-1" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-[#1a2332] mt-3 leading-snug break-words">
            {summary.group.name}
          </h2>
          {summary.group.description && (
            <p className="text-sm text-[#5a7089] mt-1 line-clamp-1">{summary.group.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <MemberAvatarStack members={summary.group.members} size="sm" />
            <span className="text-sm text-[#5a7089]">
              {summary.memberCount} member{summary.memberCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBox label="Spent" value={formatCurrency(figures.spent)} tone="neutral" />
            <StatBox label="Owed" value={formatCurrency(figures.owed)} tone="red" />
            <StatBox label="You" value={`+${formatCurrency(figures.you)}`} tone="green" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

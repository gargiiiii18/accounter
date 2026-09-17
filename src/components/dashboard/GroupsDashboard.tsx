'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Plus, Users, DollarSign, TrendingUp, ChevronRight, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { GroupForm } from '@/components/forms/GroupForm'
import { useApp } from '@/hooks/useApp'
import type { Group } from '@/lib/types'

export function GroupsDashboard() {
  const { state, createGroup, updateGroup, deleteGroup, getGroupSummary, loadAllGroupsData } = useApp()
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  useEffect(() => {
    loadAllGroupsData()
  }, [loadAllGroupsData])

  const summaries = state.groups.map(getGroupSummary)

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
    if (confirm('Delete this group? This will remove all expenses and settlements.')) {
      await deleteGroup(id)
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your expense groups</p>
        </div>
        <Button onClick={() => setNewGroupOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      {state.groups.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <Users className="h-14 w-14 mx-auto text-zinc-300 dark:text-zinc-700 mb-5" />
            <h3 className="text-xl font-medium mb-3">No groups yet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">Create your first group to start tracking expenses</p>
            <Button onClick={() => setNewGroupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map(summary => (
            <Card key={summary.group.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-xl break-words">{summary.group.name}</CardTitle>
                    {summary.group.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 break-words">{summary.group.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteGroup(summary.group.id)}
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3 mb-5">
                  <div className="flex-1 min-w-28 text-center p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <DollarSign className="h-5 w-5 mx-auto text-zinc-500 mb-2" />
                    <p className="text-lg sm:text-2xl font-bold tabular-nums">{formatCurrency(summary.totalExpenses)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Total Expenses</p>
                  </div>
                  <div className="flex-1 min-w-28 text-center p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto text-zinc-500 mb-2" />
                    <p className="text-lg sm:text-2xl font-bold tabular-nums">{summary.memberCount}</p>
                    <p className="text-xs text-zinc-500 mt-1">Members</p>
                  </div>
                  <div className="flex-1 min-w-28 text-center p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 mx-auto text-zinc-500 mb-2" />
                    <p className="text-lg sm:text-2xl font-bold text-red-500 tabular-nums">{formatCurrency(summary.unsettledAmount)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Unsettled</p>
                  </div>
                </div>
                <Link href={`/groups/${summary.group.id}`} className="block w-full text-center">
                  <Button variant="outline" className="w-full" size="lg">
                    View Details <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <GroupForm onSubmit={handleCreateGroup} onCancel={() => setNewGroupOpen(false)} />
        </DialogContent>
      </Dialog>

      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={open => !open && setEditingGroup(null)}>
          <DialogContent className="max-w-md">
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
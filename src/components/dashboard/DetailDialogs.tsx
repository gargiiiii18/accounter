'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { SettlementForm } from '@/components/forms/SettlementForm'
import { GroupForm } from '@/components/forms/GroupForm'
import type { Expense, Group, SimplifiedDebt } from '@/lib/types'
import type { ExpenseFormData, SettlementFormData } from '@/lib/validation'

interface DetailDialogsProps {
  group: Group
  groupId: string
  newExpenseOpen: boolean
  onExpenseOpenChange: (open: boolean) => void
  editingExpense: Expense | null
  onSubmitExpense: (data: ExpenseFormData) => void
  onCancelExpense: () => void
  newSettlementOpen: boolean
  onSettlementOpenChange: (open: boolean) => void
  selectedDebt: SimplifiedDebt | null
  debts: SimplifiedDebt[]
  onSubmitSettlement: (data: SettlementFormData) => void
  onCancelSettlement: () => void
  newMemberOpen: boolean
  onMemberOpenChange: (open: boolean) => void
  onAddMember: (name: string, email?: string) => void
  editGroupOpen: boolean
  onEditGroupOpenChange: (open: boolean) => void
  onSubmitGroupEdit: (data: { name: string; description?: string; members: { name: string; email?: string | null }[] }) => void
}

export function DetailDialogs(props: DetailDialogsProps) {
  const { group, groupId } = props
  const { newExpenseOpen, onExpenseOpenChange, editingExpense } = props
  const { onSubmitExpense, onCancelExpense } = props
  const { newSettlementOpen, onSettlementOpenChange, selectedDebt, debts } = props
  const { onSubmitSettlement, onCancelSettlement } = props
  const { newMemberOpen, onMemberOpenChange, onAddMember } = props
  const { editGroupOpen, onEditGroupOpenChange, onSubmitGroupEdit } = props
  return (
    <>
      <Dialog open={newExpenseOpen} onOpenChange={onExpenseOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>Split costs among group members</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            groupId={groupId}
            members={group.members}
            initialData={editingExpense || undefined}
            onSubmit={onSubmitExpense}
            onCancel={onCancelExpense}
            isEditing={!!editingExpense}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={newSettlementOpen} onOpenChange={onSettlementOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record Settlement</DialogTitle>
            <DialogDescription>Record when someone pays back</DialogDescription>
          </DialogHeader>
          <SettlementForm
            groupId={groupId}
            members={group.members}
            debts={selectedDebt ? [selectedDebt] : debts}
            initialFrom={selectedDebt?.from}
            initialTo={selectedDebt?.to}
            initialAmount={selectedDebt?.amount}
            onSubmit={onSubmitSettlement}
            onCancel={onCancelSettlement}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={newMemberOpen} onOpenChange={onMemberOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add a new member to this group</DialogDescription>
          </DialogHeader>
          <MemberFields onAddMember={onAddMember} onCancel={() => onMemberOpenChange(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editGroupOpen} onOpenChange={onEditGroupOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Rename the group or manage its members</DialogDescription>
          </DialogHeader>
          <GroupForm
            initialData={{ name: group.name, description: group.description, members: group.members }}
            onSubmit={onSubmitGroupEdit}
            onCancel={() => onEditGroupOpenChange(false)}
            isEditing
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function MemberFields(props: { onAddMember: (name: string, email?: string) => void; onCancel: () => void }) {
  const { onAddMember, onCancel } = props
  return (
    <>
      <div className="space-y-4 py-5">
        <div className="space-y-2">
          <Label htmlFor="memberName">Name</Label>
          <Input
            id="memberName"
            placeholder="Enter member name"
            onKeyDown={(e) => e.key === 'Enter' && onAddMember(e.currentTarget.value)}
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
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={() => {
            const nameInput = document.getElementById('memberName') as HTMLInputElement
            const emailInput = document.getElementById('memberEmail') as HTMLInputElement
            onAddMember(nameInput?.value || '', emailInput?.value || '')
          }}
          className="w-full sm:w-auto"
        >
          Add Member
        </Button>
      </DialogFooter>
    </>
  )
}
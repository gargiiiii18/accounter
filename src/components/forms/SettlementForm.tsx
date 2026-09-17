'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowRight } from 'lucide-react'
import { settlementSchema, type SettlementFormData } from '@/lib/validation'
import type { Member } from '@/lib/types'

interface SettlementFormProps {
  groupId: string
  members: Member[]
  debts: { from: string; fromName: string; to: string; toName: string; amount: number }[]
  onSubmit: (data: SettlementFormData) => void
  onCancel: () => void
  initialFrom?: string
  initialTo?: string
  initialAmount?: number
}

export function SettlementForm({ groupId, members, debts, onSubmit, onCancel, initialFrom, initialTo, initialAmount }: SettlementFormProps) {
  const form = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      groupId,
      fromMemberId: initialFrom || '',
      toMemberId: initialTo || '',
      // Leave empty so the placeholder shows instead of a prefilled 0
      amount: initialAmount ?? undefined,
      note: '',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data)
  })

  const memberMap = new Map(members.map(m => [m.id, m]))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {debts.length > 0 && (
        <div className="space-y-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Suggested Settlements</p>
          <div className="space-y-1">
            {debts.map((debt, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-auto py-2 px-3 text-sm"
                onClick={() => {
                  form.setValue('fromMemberId', debt.from)
                  form.setValue('toMemberId', debt.to)
                  form.setValue('amount', debt.amount)
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: memberMap.get(debt.from)?.color }}>
                    {debt.fromName[0].toUpperCase()}
                  </div>
                  <span>{debt.fromName}</span>
                  <ArrowRight className="h-4 w-4 mx-1 text-zinc-400" />
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: memberMap.get(debt.to)?.color }}>
                    {debt.toName[0].toUpperCase()}
                  </div>
                  <span>{debt.toName}</span>
                </div>
                <span className="font-medium">${debt.amount.toFixed(2)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <Label>From (who pays)</Label>
        <Select
          value={form.watch('fromMemberId')}
          onValueChange={value => form.setValue('fromMemberId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map(member => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: member.color }}>
                    {member.name[0].toUpperCase()}
                  </div>
                  {member.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.fromMemberId && (
          <p className="text-sm text-red-500">{form.formState.errors.fromMemberId.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>To (who receives)</Label>
        <Select
          value={form.watch('toMemberId')}
          onValueChange={value => form.setValue('toMemberId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map(member => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: member.color }}>
                    {member.name[0].toUpperCase()}
                  </div>
                  {member.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.toMemberId && (
          <p className="text-sm text-red-500">{form.formState.errors.toMemberId.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...form.register('amount', { valueAsNumber: true })}
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          placeholder="e.g., Venmo, Cash, Bank transfer"
          {...form.register('note')}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          {...form.register('date')}
          className="w-full max-w-xs"
        />
      </div>

      <DialogFooter className="border-t pt-6">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto">
          Record Settlement
        </Button>
      </DialogFooter>
    </form>
  )
}
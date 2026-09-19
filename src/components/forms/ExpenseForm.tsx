'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calculator, Percent, DollarSign, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { expenseSchema, type ExpenseFormData } from '@/lib/validation'
import type { Member } from '@/lib/types'
import { calculateSplits } from '@/lib/balance'

interface ExpenseFormProps {
  groupId: string
  members: Member[]
  initialData?: Partial<ExpenseFormData>
  onSubmit: (data: ExpenseFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

export function ExpenseForm({ groupId, members, initialData, onSubmit, onCancel, isEditing }: ExpenseFormProps) {
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>(initialData?.splitType || 'equal')
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || members[0]?.id || '')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(() => {
    if (initialData?.splits && initialData.splits.length > 0) {
      return new Set(initialData.splits.map(s => s.memberId))
    }
    return new Set(members.map(m => m.id))
  })

  const selectedMembersList = useMemo(
    () => members.filter(m => selectedMembers.has(m.id)),
    [members, selectedMembers]
  )

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      groupId,
      description: initialData?.description || '',
      // Leave empty so the placeholder shows instead of a prefilled 0
      amount: initialData?.amount ?? undefined,
      paidBy,
      splitType,
      splits: initialData?.splits || [],
      date: initialData?.date || new Date().toISOString().split('T')[0],
    },
  })

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const selectAll = () => setSelectedMembers(new Set(members.map(m => m.id)))
  const clearAll = () => setSelectedMembers(new Set())

  const amount = form.watch("amount")

  useEffect(() => {
    if (selectedMembersList.length === 0) return

    form.setValue('splitType', splitType)
    const currentSplits = form.getValues('splits')
    const selectedIds = selectedMembersList.map(m => m.id)

    const customSplits = splitType !== 'equal'
      ? currentSplits.filter(s => selectedMembers.has(s.memberId)).map(s => ({
          memberId: s.memberId,
          amount: s.amount,
          percentage: s.percentage,
        }))
      : undefined

    const newSplits = calculateSplits(
      amount || 0,
      selectedIds,
      splitType,
      customSplits
    ).map(s => ({ memberId: s.memberId, amount: s.amount, percentage: s.percentage }))

    form.setValue('splits', newSplits)
  }, [splitType, selectedMembersList, form, amount])

  useEffect(() => {
    if (paidBy && selectedMembers.has(paidBy)) {
      form.setValue('paidBy', paidBy)
    } else if (selectedMembersList.length > 0) {
      setPaidBy(selectedMembersList[0].id)
      form.setValue('paidBy', selectedMembersList[0].id)
    }
  }, [paidBy, selectedMembersList, form])

  const handleSubmit = form.handleSubmit((data) => {
    if (selectedMembersList.length === 0) return
    onSubmit(data)
  })

  const totalAmount = amount || 0
  const splits = form.watch('splits')
  const splitSum = useMemo(() => {
    if (splitType === 'exact') {
      return splits.filter(s => selectedMembers.has(s.memberId)).reduce((sum, s) => sum + (s.amount || 0), 0)
    }
    if (splitType === 'percentage') {
      return splits.filter(s => selectedMembers.has(s.memberId)).reduce((sum, s) => sum + (s.percentage || 0), 0)
    }
    return 0
  }, [splits, splitType, selectedMembers])

  const isValidSum = splitType === 'equal' ? true : splitType === 'exact'
    ? Math.abs(splitSum - totalAmount) < 0.01
    : Math.abs(splitSum - 100) < 0.01

  const renderEqualSplit = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Split equally among {selectedMembersList.length} member{selectedMembersList.length !== 1 ? 's' : ''}
      </p>
      {selectedMembersList.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-3 border border-white/15 bg-white/[0.07] rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: member.color }}>
              {member.name[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium">{member.name}</span>
          </div>
          <span className="font-semibold">{totalAmount > 0 && selectedMembersList.length > 0 ? (totalAmount / selectedMembersList.length).toFixed(2) : '0.00'}</span>
        </div>
      ))}
    </div>
  )

  const renderExactSplit = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">Total: {splitSum.toFixed(2)} / {totalAmount.toFixed(2)}</span>
        {!isValidSum && <span className="text-red-500 font-medium">Amounts must sum to total</span>}
      </div>
      {selectedMembersList.map((member) => {
        const split = splits.find(s => s.memberId === member.id)
        return (
          <div key={member.id} className="flex items-center space-x-3 p-3 border border-white/15 bg-white/[0.03] rounded-lg">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ backgroundColor: member.color }}>
              {member.name[0].toUpperCase()}
            </div>
            <Label className="flex-1 text-sm mb-0">{member.name}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={split?.amount || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                const exists = splits.some(s => s.memberId === member.id)
                const newSplits = exists
                  ? splits.map(s => s.memberId === member.id ? { ...s, amount: val } : s)
                  : [...splits, { memberId: member.id, amount: val }]
                form.setValue('splits', newSplits)
              }}
              className="w-28 text-right"
            />
          </div>
        )
      })}
    </div>
  )

  const renderPercentageSplit = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">Total: {splitSum.toFixed(1)}%</span>
        {!isValidSum && <span className="text-red-500 font-medium">Must sum to 100%</span>}
      </div>
      {selectedMembersList.map((member) => {
        const split = splits.find(s => s.memberId === member.id)
        return (
          <div key={member.id} className="flex items-center space-x-3 p-3 border border-white/15 bg-white/[0.03] rounded-lg">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ backgroundColor: member.color }}>
              {member.name[0].toUpperCase()}
            </div>
            <Label className="flex-1 text-sm mb-0">{member.name}</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="0%"
              value={split?.percentage || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                const splitAmount = Math.round((totalAmount * val) / 100 * 100) / 100
                const exists = splits.some(s => s.memberId === member.id)
                const newSplits = exists
                  ? splits.map(s => s.memberId === member.id ? { ...s, percentage: val, amount: splitAmount } : s)
                  : [...splits, { memberId: member.id, percentage: val, amount: splitAmount }]
                form.setValue('splits', newSplits)
              }}
              className="w-24 text-right"
            />
            <span className="text-slate-300">%</span>
          </div>
        )
      })}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g., Dinner, Uber, Groceries"
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 h-4 w-4" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="pl-8"
              {...form.register('amount', { valueAsNumber: true })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidBy">Paid By</Label>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger id="paidBy">
              <SelectValue placeholder="Select payer" />
            </SelectTrigger>
            <SelectContent>
              {selectedMembersList.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <div className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: member.color }}>
                      {member.name[0].toUpperCase()}
                    </div>
                    {member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          {...form.register('date')}
          className="w-full max-w-xs"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Who&apos;s in this?</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
              All
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
              None
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {members.map(member => {
            const isSelected = selectedMembers.has(member.id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={cn(
                  'flex items-center space-x-2 p-2 rounded-lg border transition-all text-left',
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-white/[0.07]'
                    : 'border-white/15 opacity-40 hover:opacity-70'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded flex items-center justify-center shrink-0 border',
                  isSelected ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600'
                )}>
                  {isSelected && <Check className="h-2.5 w-2.5 text-white dark:text-zinc-900" />}
                </div>
                <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0" style={{ backgroundColor: member.color }}>
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium truncate">{member.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Split Type</Label>
        <Tabs value={splitType} onValueChange={(value) => setSplitType(value as 'equal' | 'exact' | 'percentage')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equal">
              <DollarSign className="h-4 w-4 mr-1" />
              Equal
            </TabsTrigger>
            <TabsTrigger value="exact">
              <Calculator className="h-4 w-4 mr-1" />
              Exact
            </TabsTrigger>
            <TabsTrigger value="percentage">
              <Percent className="h-4 w-4 mr-1" />
              Percentage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equal">{renderEqualSplit()}</TabsContent>
          <TabsContent value="exact">{renderExactSplit()}</TabsContent>
          <TabsContent value="percentage">{renderPercentageSplit()}</TabsContent>
        </Tabs>

        {form.formState.errors.splits && (
          <p className="text-sm text-red-500">{form.formState.errors.splits.message}</p>
        )}
      </div>

      <DialogFooter className="border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={!isValidSum || selectedMembersList.length === 0} className="w-full sm:w-auto">
          {isEditing ? 'Update' : 'Add Expense'}
        </Button>
      </DialogFooter>
    </form>
  )
}

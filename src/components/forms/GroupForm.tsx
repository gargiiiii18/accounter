'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Plus, UserPlus, X } from 'lucide-react'
import { groupSchema, type GroupFormData } from '@/lib/validation'

interface GroupFormProps {
  initialData?: Partial<GroupFormData>
  onSubmit: (data: GroupFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

export function GroupForm({ initialData, onSubmit, onCancel, isEditing }: GroupFormProps) {
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      members: initialData?.members?.map(m => ({ name: m.name, email: m.email || '' })) || [{ name: '', email: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'members' })

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data)
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          placeholder="e.g., Roommates, Trip to Japan"
          {...form.register('name')}
          aria-invalid={!!form.formState.errors.name}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="What's this group for?"
          {...form.register('description')}
          rows={2}
        />
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-medium">Members</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => append({ name: '', email: '' })} className="h-8">
            <UserPlus className="h-4 w-4 mr-1" />
            Add Member
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center space-x-2 p-4 border border-white/15 bg-white/[0.03] rounded-xl">
            <Input
              placeholder="Name"
              {...form.register(`members.${index}.name`)}
              className="flex-1"
              required
            />
            <Input
              placeholder="Email (optional)"
              {...form.register(`members.${index}.email`)}
              className="flex-1"
              type="email"
            />
            {fields.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-400">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <DialogFooter className="border-t pt-6">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto">
          {isEditing ? 'Update' : 'Create Group'}
        </Button>
      </DialogFooter>
    </form>
  )
}
import { z } from 'zod'

export const memberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().nullish(),
})

export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  members: z.array(memberSchema).min(1, 'At least one member required'),
})

export const splitSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  amount: z.number().min(0, 'Amount must be positive').optional(),
  percentage: z.number().min(0, 'Percentage must be positive').max(100, 'Percentage max 100').optional(),
})

export const expenseSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  amount: z.number({ message: 'Amount is required' }).min(0.01, 'Amount must be greater than 0'),
  paidBy: z.string().min(1, 'Payer is required'),
  splitType: z.enum(['equal', 'exact', 'percentage']),
  splits: z.array(splitSchema).min(1, 'At least one split required'),
  date: z.string().min(1, 'Date is required'),
  // Set when a record is cleared from balances; kept in the database as proof
  archivedAt: z.string().optional(),
}).refine(
  data => {
    if (data.splitType === 'equal') return true
    if (data.splitType === 'exact') {
      const sum = data.splits.reduce((acc, s) => acc + (s.amount || 0), 0)
      return Math.abs(sum - data.amount) < 0.01
    }
    if (data.splitType === 'percentage') {
      const sum = data.splits.reduce((acc, s) => acc + (s.percentage || 0), 0)
      return Math.abs(sum - 100) < 0.01
    }
    return true
  },
  {
    message: 'Split amounts/percentages must sum to total',
    path: ['splits'],
  }
)

export const settlementSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  fromMemberId: z.string().min(1, 'From member is required'),
  toMemberId: z.string().min(1, 'To member is required'),
  amount: z.number({ message: 'Amount is required' }).min(0.01, 'Amount must be greater than 0'),
  note: z.string().max(200, 'Note too long').optional(),
  date: z.string().min(1, 'Date is required'),
  // Set when a record is cleared from balances; kept in the database as proof
  archivedAt: z.string().optional(),
}).refine(data => data.fromMemberId !== data.toMemberId, {
  message: 'Cannot settle with yourself',
  path: ['toMemberId'],
})

export type MemberFormData = z.infer<typeof memberSchema>
export type GroupFormData = z.infer<typeof groupSchema>
export type ExpenseFormData = z.infer<typeof expenseSchema>
export type SettlementFormData = z.infer<typeof settlementSchema>
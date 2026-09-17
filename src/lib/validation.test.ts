import { describe, it, expect } from 'vitest'
import { memberSchema, groupSchema, expenseSchema, settlementSchema } from '@/lib/validation'

describe('validation schemas', () => {
  describe('memberSchema', () => {
    it('validates valid member', () => {
      const result = memberSchema.safeParse({ name: 'John', email: 'john@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = memberSchema.safeParse({ name: '', email: 'john@example.com' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = memberSchema.safeParse({ name: 'John', email: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('allows empty email', () => {
      const result = memberSchema.safeParse({ name: 'John', email: '' })
      expect(result.success).toBe(true)
    })
  })

  describe('groupSchema', () => {
    it('validates valid group', () => {
      const result = groupSchema.safeParse({
        name: 'Roommates',
        description: 'Apartment expenses',
        members: [{ name: 'Alice' }, { name: 'Bob' }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = groupSchema.safeParse({
        name: '',
        members: [{ name: 'Alice' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty members', () => {
      const result = groupSchema.safeParse({
        name: 'Group',
        members: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('expenseSchema', () => {
    const baseExpense = {
      groupId: 'g1',
      description: 'Dinner',
      amount: 100,
      paidBy: '1',
      date: new Date().toISOString().split('T')[0],
    }

    it('validates equal split', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        splitType: 'equal',
        splits: [{ memberId: '1' }, { memberId: '2' }],
      })
      expect(result.success).toBe(true)
    })

    it('validates exact split with correct sum', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        splitType: 'exact',
        splits: [
          { memberId: '1', amount: 60 },
          { memberId: '2', amount: 40 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects exact split with incorrect sum', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        splitType: 'exact',
        splits: [
          { memberId: '1', amount: 60 },
          { memberId: '2', amount: 30 },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('validates percentage split with correct sum', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        splitType: 'percentage',
        splits: [
          { memberId: '1', percentage: 60 },
          { memberId: '2', percentage: 40 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects percentage split with incorrect sum', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        splitType: 'percentage',
        splits: [
          { memberId: '1', percentage: 60 },
          { memberId: '2', percentage: 30 },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty description', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        description: '',
        splitType: 'equal',
        splits: [{ memberId: '1' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects zero amount', () => {
      const result = expenseSchema.safeParse({
        ...baseExpense,
        amount: 0,
        splitType: 'equal',
        splits: [{ memberId: '1' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('settlementSchema', () => {
    const baseSettlement = {
      groupId: 'g1',
      fromMemberId: '1',
      toMemberId: '2',
      amount: 50,
      date: new Date().toISOString().split('T')[0],
    }

    it('validates valid settlement', () => {
      const result = settlementSchema.safeParse(baseSettlement)
      expect(result.success).toBe(true)
    })

    it('rejects same from and to', () => {
      const result = settlementSchema.safeParse({
        ...baseSettlement,
        fromMemberId: '1',
        toMemberId: '1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects zero amount', () => {
      const result = settlementSchema.safeParse({
        ...baseSettlement,
        amount: 0,
      })
      expect(result.success).toBe(false)
    })
  })
})
import { describe, it, expect } from 'vitest'
import { calculateSplits, calculateBalances, simplifyDebts, isPersonalExpense } from '@/lib/balance'
import type { Expense, Member, Settlement } from '@/lib/types'

const mockMembers: Member[] = [
  { id: '1', name: 'Alice', color: '#EF4444', createdAt: new Date().toISOString() },
  { id: '2', name: 'Bob', color: '#3B82F6', createdAt: new Date().toISOString() },
  { id: '3', name: 'Charlie', color: '#22C55E', createdAt: new Date().toISOString() },
]

const mockExpenses: Expense[] = [
  {
    id: 'e1',
    groupId: 'g1',
    description: 'Dinner',
    amount: 90,
    paidBy: '1',
    splitType: 'equal',
    splits: [
      { memberId: '1', amount: 30 },
      { memberId: '2', amount: 30 },
      { memberId: '3', amount: 30 },
    ],
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    groupId: 'g1',
    description: 'Uber',
    amount: 30,
    paidBy: '2',
    splitType: 'exact',
    splits: [
      { memberId: '1', amount: 10 },
      { memberId: '2', amount: 10 },
      { memberId: '3', amount: 10 },
    ],
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

const mockSettlements: Settlement[] = [
  {
    id: 's1',
    groupId: 'g1',
    fromMemberId: '3',
    toMemberId: '1',
    amount: 20,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

describe('calculateSplits', () => {
  it('splits equally among members', () => {
    const splits = calculateSplits(100, ['1', '2', '3'], 'equal')
    expect(splits).toHaveLength(3)
    expect(splits[0].amount).toBeCloseTo(33.33, 1)
    expect(splits[1].amount).toBeCloseTo(33.33, 1)
    expect(splits[2].amount).toBeCloseTo(33.34, 1)
  })

  it('uses exact amounts provided', () => {
    const customSplits = [
      { memberId: '1', amount: 50 },
      { memberId: '2', amount: 30 },
      { memberId: '3', amount: 20 },
    ]
    const splits = calculateSplits(100, ['1', '2', '3'], 'exact', customSplits)
    expect(splits[0].amount).toBe(50)
    expect(splits[1].amount).toBe(30)
    expect(splits[2].amount).toBe(20)
  })

  it('calculates percentages correctly', () => {
    const customSplits = [
      { memberId: '1', percentage: 50 },
      { memberId: '2', percentage: 30 },
      { memberId: '3', percentage: 20 },
    ]
    const splits = calculateSplits(100, ['1', '2', '3'], 'percentage', customSplits)
    expect(splits[0].amount).toBe(50)
    expect(splits[1].amount).toBe(30)
    expect(splits[2].amount).toBe(20)
    expect(splits[0].percentage).toBe(50)
  })
})

describe('calculateBalances', () => {
  it('calculates correct balances with no settlements', () => {
    const balances = calculateBalances(mockExpenses, mockMembers, [])
    
    const alice = balances.find(b => b.memberId === '1')
    const bob = balances.find(b => b.memberId === '2')
    const charlie = balances.find(b => b.memberId === '3')
    
    // Alice paid 90, owed 30+10=40, net = +50
    expect(alice?.paid).toBe(90)
    expect(alice?.owed).toBe(40)
    expect(alice?.net).toBe(50)
    
    // Bob paid 30, owed 30+10=40, net = -10
    expect(bob?.paid).toBe(30)
    expect(bob?.owed).toBe(40)
    expect(bob?.net).toBe(-10)
    
    // Charlie paid 0, owed 30+10=40, net = -40
    expect(charlie?.paid).toBe(0)
    expect(charlie?.owed).toBe(40)
    expect(charlie?.net).toBe(-40)
  })

  it('accounts for settlements', () => {
    const balances = calculateBalances(mockExpenses, mockMembers, mockSettlements)
    
    const alice = balances.find(b => b.memberId === '1')
    const charlie = balances.find(b => b.memberId === '3')
    
    // Alice net was 50, receives 20 from settlement, net = 30
    expect(alice?.net).toBe(30)
    
    // Charlie net was -40, pays 20 in settlement, net = -20
    expect(charlie?.net).toBe(-20)
  })
})

describe('simplifyDebts', () => {
  it('simplifies debts correctly', () => {
    const balances = [
      { memberId: '1', memberName: 'Alice', paid: 90, owed: 40, net: 50 },
      { memberId: '2', memberName: 'Bob', paid: 30, owed: 40, net: -10 },
      { memberId: '3', memberName: 'Charlie', paid: 0, owed: 40, net: -40 },
    ]
    
    const debts = simplifyDebts(balances)
    
    expect(debts).toHaveLength(2)
    expect(debts[0]).toEqual({
      from: '3',
      fromName: 'Charlie',
      to: '1',
      toName: 'Alice',
      amount: 40,
    })
    expect(debts[1]).toEqual({
      from: '2',
      fromName: 'Bob',
      to: '1',
      toName: 'Alice',
      amount: 10,
    })
  })

  it('handles already settled case', () => {
    const balances = [
      { memberId: '1', memberName: 'Alice', paid: 50, owed: 50, net: 0 },
      { memberId: '2', memberName: 'Bob', paid: 50, owed: 50, net: 0 },
    ]
    
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(0)
  })

  it('handles single creditor and debtor', () => {
    const balances = [
      { memberId: '1', memberName: 'Alice', paid: 100, owed: 0, net: 100 },
      { memberId: '2', memberName: 'Bob', paid: 0, owed: 100, net: -100 },
    ]
    
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(1)
    expect(debts[0]).toEqual({
      from: '2',
      fromName: 'Bob',
      to: '1',
      toName: 'Alice',
      amount: 100,
    })
  })
})
describe('isPersonalExpense', () => {
  it('detects a self-expense (paid by the only split member)', () => {
    expect(isPersonalExpense({ paidBy: '1', splits: [{ memberId: '1', amount: 50 }] })).toBe(true)
  })

  it('is false for shared expenses', () => {
    expect(isPersonalExpense({ paidBy: '1', splits: [{ memberId: '1', amount: 25 }, { memberId: '2', amount: 25 }] })).toBe(false)
  })
})

describe('archived records', () => {
  it('excludes archived expenses from balances', () => {
    const balances = calculateBalances([{ ...mockExpenses[0], archivedAt: new Date().toISOString() }, mockExpenses[1]], mockMembers, [])
    const alice = balances.find(b => b.memberId === '1')
    const bob = balances.find(b => b.memberId === '2')
    const charlie = balances.find(b => b.memberId === '3')
    // Only e2 (Uber) counts: Alice paid 0, owed 10; Bob paid 30, owed 10; Charlie paid 0, owed 10
    expect(alice?.paid).toBe(0)
    expect(alice?.owed).toBe(10)
    expect(alice?.net).toBe(-10)
    expect(bob?.paid).toBe(30)
    expect(bob?.owed).toBe(10)
    expect(bob?.net).toBe(20)
    expect(charlie?.paid).toBe(0)
    expect(charlie?.owed).toBe(10)
    expect(charlie?.net).toBe(-10)
  })

  it('excludes archived settlements from balances', () => {
    const balances = calculateBalances(mockExpenses, mockMembers, [{ ...mockSettlements[0], archivedAt: new Date().toISOString() }])
    const alice = balances.find(b => b.memberId === '1')
    const charlie = balances.find(b => b.memberId === '3')
    // Same as no settlements: Alice net +50, Charlie net -40
    expect(alice?.net).toBe(50)
    expect(charlie?.net).toBe(-40)
  })
})
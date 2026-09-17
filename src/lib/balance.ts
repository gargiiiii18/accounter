import type { Expense, Member, Settlement, Balance, SimplifiedDebt, SplitType } from './types'

export function calculateSplits(
  amount: number,
  memberIds: string[],
  splitType: SplitType,
  customSplits?: { memberId: string; amount?: number; percentage?: number }[]
): { memberId: string; amount: number; percentage?: number }[] {
  // Default to equal split if no custom splits provided for exact/percentage
  const effectiveSplits = customSplits || memberIds.map(memberId => ({ memberId, amount: 0, percentage: 0 }))

  switch (splitType) {
    case 'equal': {
      const perPerson = amount / memberIds.length
      return memberIds.map(memberId => ({
        memberId,
        amount: Math.round(perPerson * 100) / 100,
      }))
    }
    case 'exact': {
      return effectiveSplits.map(s => ({
        memberId: s.memberId,
        amount: s.amount || 0,
      }))
    }
    case 'percentage': {
      return effectiveSplits.map(s => ({
        memberId: s.memberId,
        amount: Math.round((amount * (s.percentage || 0)) / 100 * 100) / 100,
        percentage: s.percentage,
      }))
    }
  }
}

export function calculateBalances(
  expenses: Expense[],
  members: Member[],
  settlements: Settlement[]
): Balance[] {
  const memberMap = new Map(members.map(m => [m.id, m]))
  const balances = new Map<string, { paid: number; owed: number }>()

  members.forEach(m => {
    balances.set(m.id, { paid: 0, owed: 0 })
  })

  expenses.forEach(expense => {
    const paid = balances.get(expense.paidBy)
    if (paid) paid.paid += expense.amount

    expense.splits.forEach(split => {
      const owed = balances.get(split.memberId)
      if (owed) owed.owed += split.amount
    })
  })

  settlements.forEach(settlement => {
    const from = balances.get(settlement.fromMemberId)
    const to = balances.get(settlement.toMemberId)
    if (from) from.owed -= settlement.amount
    if (to) to.paid -= settlement.amount
  })

  // Normalize -0 to 0 so values never render as "-$0.00" or "+-$0.00".
  const round = (value: number) => {
    const rounded = Math.round(value * 100) / 100
    return rounded === 0 ? 0 : rounded
  }

  return Array.from(balances.entries()).map(([memberId, { paid, owed }]) => ({
    memberId,
    memberName: memberMap.get(memberId)?.name || 'Unknown',
    paid: round(paid),
    owed: round(owed),
    net: round(paid - owed),
  }))
}

export function simplifyDebts(balances: Balance[]): SimplifiedDebt[] {
  const creditors = balances
    .filter(b => b.net > 0.01)
    .sort((a, b) => b.net - a.net)
    .map(b => ({ ...b }))

  const debtors = balances
    .filter(b => b.net < -0.01)
    .sort((a, b) => a.net - b.net)
    .map(b => ({ ...b }))

  const debts: SimplifiedDebt[] = []
  let i = 0, j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]

    const amount = Math.min(creditor.net, -debtor.net)
    const roundedAmount = Math.round(amount * 100) / 100

    if (roundedAmount > 0.01) {
      debts.push({
        from: debtor.memberId,
        fromName: debtor.memberName,
        to: creditor.memberId,
        toName: creditor.memberName,
        amount: roundedAmount,
      })
    }

    creditor.net = Math.round((creditor.net - amount) * 100) / 100
    debtor.net = Math.round((debtor.net + amount) * 100) / 100

    if (creditor.net <= 0.01) i++
    if (debtor.net >= -0.01) j++
  }

  return debts
}

export function getMemberTotalPaid(expenses: Expense[], memberId: string): number {
  return expenses
    .filter(e => e.paidBy === memberId)
    .reduce((sum, e) => sum + e.amount, 0)
}

export function getMemberTotalOwed(expenses: Expense[], memberId: string): number {
  return expenses
    .flatMap(e => e.splits)
    .filter(s => s.memberId === memberId)
    .reduce((sum, s) => sum + s.amount, 0)
}

export function getMemberTotalSettled(settlements: Settlement[], memberId: string): { paid: number; received: number } {
  let paid = 0
  let received = 0

  settlements.forEach(s => {
    if (s.fromMemberId === memberId) paid += s.amount
    if (s.toMemberId === memberId) received += s.amount
  })

  return { paid, received }
}
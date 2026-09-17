export interface Member {
  id: string
  name: string
  email?: string
  color?: string
  /** Clerk user id when this member is linked to a registered Clerk account */
  clerkUserId?: string
  createdAt: string
}

/** Minimal member payload sent from forms; ids/colors/identity are resolved server-side */
export interface MemberInput {
  id?: string
  name: string
  email?: string | null
}

export interface Group {
  id: string
  name: string
  description?: string
  members: Member[]
  createdAt: string
  updatedAt: string
}

export interface GroupInput {
  name: string
  description?: string
  members: MemberInput[]
}

export type SplitType = 'equal' | 'exact' | 'percentage'

export interface Split {
  memberId: string
  amount: number
  percentage?: number
}

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  paidBy: string
  splitType: SplitType
  splits: Split[]
  date: string
  createdAt: string
}

export interface Settlement {
  id: string
  groupId: string
  fromMemberId: string
  toMemberId: string
  amount: number
  note?: string
  date: string
  createdAt: string
}

export interface Balance {
  memberId: string
  memberName: string
  paid: number
  owed: number
  net: number
}

export interface SimplifiedDebt {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
}

export interface GroupSummary {
  group: Group
  totalExpenses: number
  totalSettled: number
  unsettledAmount: number
  memberCount: number
}
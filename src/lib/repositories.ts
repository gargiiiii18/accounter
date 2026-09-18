import 'server-only'
import { type Collection, type Filter } from 'mongodb'
import { getCollections } from './mongodb'
import { calculateBalances, isPersonalExpense } from './balance'
import { generateId, getRandomColor } from './utils'
import type { Group, Member, MemberInput, Expense, Settlement } from './types'

// Server-only data access over MongoDB Atlas. Every query is scoped by the
// authenticated Clerk user id so users can only ever see their own data.

interface GroupDoc extends Group {
  userId: string
}

interface ExpenseDoc extends Expense {
  userId: string
}

interface SettlementDoc extends Settlement {
  userId: string
}

// Strips the Mongo `_id` so responses match the app's own `id` field shape.
function serialize<T>(doc: (T & { _id?: unknown }) | null): T | null {
  if (!doc) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc
  return rest as T
}

let cached: { groups: Collection<GroupDoc>; expenses: Collection<ExpenseDoc>; settlements: Collection<SettlementDoc> } | null = null

async function collections() {
  if (!cached) {
    const cols = await getCollections()
    cached = {
      groups: cols.groups as unknown as Collection<GroupDoc>,
      expenses: cols.expenses as unknown as Collection<ExpenseDoc>,
      settlements: cols.settlements as unknown as Collection<SettlementDoc>,
    }
    // Idempotent, cheap index creation.
    void cached.groups.createIndex({ id: 1 }, { unique: true })
    void cached.groups.createIndex({ userId: 1, updatedAt: -1 })
    void cached.expenses.createIndex({ id: 1 }, { unique: true })
    void cached.expenses.createIndex({ userId: 1, groupId: 1 })
    void cached.settlements.createIndex({ id: 1 }, { unique: true })
    void cached.settlements.createIndex({ userId: 1, groupId: 1 })
  }
  return cached
}

/**
 * Looks up a registered Clerk user by email so members can carry a real
 * identity (clerkUserId) instead of just a static name.
 */
async function findClerkUserByEmail(email: string): Promise<{ id: string; name: string } | null> {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const res = await client.users.getUserList({ emailAddress: [email.toLowerCase()], limit: 1 })
    const user = res.data[0]
    if (!user) return null
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return { id: user.id, name: fullName || user.username || email }
  } catch {
    // Never fail a group mutation because the identity lookup failed
    return null
  }
}

async function resolveMember(input: MemberInput): Promise<Member> {
  const email = input.email?.trim() || undefined
  const member: Member = {
    id: input.id || generateId(),
    name: input.name.trim(),
    email,
    color: getRandomColor(),
    createdAt: new Date().toISOString(),
  }
  if (email) {
    const user = await findClerkUserByEmail(email)
    if (user) {
      member.clerkUserId = user.id
      member.name = input.name.trim() || user.name
    }
  }
  return member
}

/**
 * Normalizes a members array coming from the client: keeps ids of existing
 * members (matched by id, then email, then name), resolves Clerk identities
 * for new members, and assigns ids/colors.
 */
export async function resolveMembers(
  existingMembers: Member[] | undefined,
  incoming: MemberInput[]
): Promise<Member[]> {
  const existing = existingMembers ?? []
  const used = new Set<string>()
  const result: Member[] = []

  for (const raw of incoming) {
    const name = raw.name.trim()
    const email = raw.email?.trim() || undefined

    // 1) exact id match
    let match = raw.id ? existing.find(m => m.id === raw.id) : undefined
    // 2) email match
    if (!match && email) match = existing.find(m => m.email && m.email.toLowerCase() === email.toLowerCase())
    // 3) name match
    if (!match) match = existing.find(m => m.name.toLowerCase() === name.toLowerCase())

    if (match && !used.has(match.id)) {
      used.add(match.id)
      const member: Member = {
        ...match,
        name: name || match.name,
        email: email ?? match.email,
      }
      // (Re-)attempt Clerk identity link for members that don't have one yet
      if (!member.clerkUserId && member.email) {
        const user = await findClerkUserByEmail(member.email)
        if (user) member.clerkUserId = user.id
      }
      result.push(member)
    } else {
      const member = await resolveMember({ name, email })
      used.add(member.id)
      result.push(member)
    }
  }

  return result
}

export async function listGroups(userId: string): Promise<Group[]> {
  const { groups } = await collections()
  const docs = await groups
    .find({ userId } as Filter<GroupDoc>)
    .sort({ updatedAt: -1 })
    .toArray()
  return docs.map(d => serialize(d)!)
}

export async function getGroup(userId: string, id: string): Promise<Group | null> {
  const { groups } = await collections()
  return serialize(await groups.findOne({ userId, id } as Filter<GroupDoc>))
}

export async function createGroup(userId: string, input: { name: string; description?: string; members: MemberInput[] }): Promise<Group> {
  const { groups } = await collections()
  const now = new Date().toISOString()
  const members = await resolveMembers([], input.members)
  const group: GroupDoc = {
    id: generateId(),
    name: input.name,
    description: input.description,
    members,
    userId,
    createdAt: now,
    updatedAt: now,
  }
  await groups.insertOne(group)
  return serialize(group)!
}

export async function updateGroup(
  userId: string,
  id: string,
  updates: { name?: string; description?: string; members?: MemberInput[] }
): Promise<Group | null> {
  const { groups } = await collections()
  const current = await groups.findOne({ userId, id } as Filter<GroupDoc>)
  if (!current) return null

  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (updates.name !== undefined) set.name = updates.name
  if (updates.description !== undefined) set.description = updates.description
  if (updates.members !== undefined) {
    set.members = await resolveMembers(current.members, updates.members)
  }

  await groups.updateOne({ userId, id } as Filter<GroupDoc>, { $set: set })
  return getGroup(userId, id)
}

export async function removeGroupMember(
  userId: string,
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const { groups } = await collections()
  const current = await groups.findOne({ userId, id: groupId } as Filter<GroupDoc>)
  if (!current) return null

  const updatedMembers = current.members.filter(m => m.id !== memberId)
  await groups.updateOne(
    { userId, id: groupId } as Filter<GroupDoc>,
    { $set: { members: updatedMembers, updatedAt: new Date().toISOString() } }
  )
  return getGroup(userId, groupId)
}

export async function deleteGroup(userId: string, id: string): Promise<boolean> {
  const { groups, expenses, settlements } = await collections()
  // Remove the group's history FIRST (expenses + settlements) so a failure can
  // be retried safely and can never leave orphaned records behind for a group
  // that no longer exists. Also cleans up leftovers if the group row was
  // already removed by an earlier partial delete.
  await expenses.deleteMany({ userId, groupId: id } as Filter<ExpenseDoc>)
  await settlements.deleteMany({ userId, groupId: id } as Filter<SettlementDoc>)
  const result = await groups.deleteOne({ userId, id } as Filter<GroupDoc>)
  return result.deletedCount > 0
}

async function touchGroup(userId: string, groupId: string): Promise<void> {
  const { groups } = await collections()
  await groups.updateOne(
    { userId, id: groupId } as Filter<GroupDoc>,
    { $set: { updatedAt: new Date().toISOString() } }
  )
}

export async function listExpenses(userId: string, groupId: string): Promise<Expense[]> {
  const { expenses } = await collections()
  const docs = await expenses
    .find({ userId, groupId } as Filter<ExpenseDoc>)
    .sort({ date: -1, createdAt: -1 })
    .toArray()
  return docs.map(d => serialize(d)!)
}

export async function createExpense(userId: string, input: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense | null> {
  const { expenses } = await collections()
  const group = await getGroup(userId, input.groupId)
  if (!group) return null
  const expense: ExpenseDoc = {
    ...input,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString(),
  }
  await expenses.insertOne(expense)
  await touchGroup(userId, input.groupId)
  return serialize(expense)!
}

export async function updateExpense(userId: string, id: string, updates: Partial<Expense>): Promise<Expense | null> {
  const { expenses } = await collections()
  const current = await expenses.findOne({ userId, id } as Filter<ExpenseDoc>)
  if (!current) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...base } = current
  const merged: ExpenseDoc = { ...base, ...updates, userId }
  await expenses.replaceOne({ userId, id } as Filter<ExpenseDoc>, merged)
  await touchGroup(userId, current.groupId)
  return merged as Expense
}

export async function deleteExpense(userId: string, id: string): Promise<Expense | null> {
  const { expenses } = await collections()
  const deleted = await expenses.findOneAndDelete({ userId, id } as Filter<ExpenseDoc>)
  const expense = serialize(deleted ?? null)
  if (expense) await touchGroup(userId, expense.groupId)
  return expense
}

export async function listSettlements(userId: string, groupId: string): Promise<Settlement[]> {
  const { settlements } = await collections()
  const docs = await settlements
    .find({ userId, groupId } as Filter<SettlementDoc>)
    .sort({ date: -1, createdAt: -1 })
    .toArray()
  return docs.map(d => serialize(d)!)
}

export async function createSettlement(userId: string, input: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement | null> {
  const { settlements } = await collections()
  const group = await getGroup(userId, input.groupId)
  if (!group) return null
  const settlement: SettlementDoc = {
    ...input,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString(),
  }
  await settlements.insertOne(settlement)
  await touchGroup(userId, input.groupId)
  return serialize(settlement)!
}

export async function deleteSettlement(userId: string, id: string): Promise<Settlement | null> {
  const { settlements } = await collections()
  const deleted = await settlements.findOneAndDelete({ userId, id } as Filter<SettlementDoc>)
  const settlement = serialize(deleted ?? null)
  if (settlement) await touchGroup(userId, settlement.groupId)
  return settlement
}

export type ResetGroupBalancesResult = 'not-found' | 'not-settled' | 'ok'

/**
 * Clears every expense and settlement of a group so all Paid/Owed/Net fields
 * go back to zero. Only allowed once every member is fully settled up, which
 * is re-verified here from stored data (never trust the client alone).
 */
export async function resetGroupBalances(userId: string, groupId: string): Promise<ResetGroupBalancesResult> {
  const group = await getGroup(userId, groupId)
  if (!group) return 'not-found'

  const [expenses, settlements] = await Promise.all([
    listExpenses(userId, groupId),
    listSettlements(userId, groupId),
  ])

  const settledUp = calculateBalances(expenses, group.members, settlements)
    .every(balance => Math.abs(balance.net) <= 0.01)
  if (!settledUp) return 'not-settled'

    // History is immutable: records are archived (kept in the database as
  // proof) instead of deleted, and simply stop counting toward balances.
  // Personal records (a member's own payments) are never auto-cleared.
  const now = new Date().toISOString()
  const mutualExpenseIds = expenses
    .filter(e => !e.archivedAt && !isPersonalExpense(e))
    .map(e => e.id)
  const activeSettlementIds = settlements.filter(s => !s.archivedAt).map(s => s.id)

  const { expenses: expenseCol, settlements: settlementCol } = await collections()
  if (mutualExpenseIds.length > 0) {
    await expenseCol.updateMany(
      { userId, groupId, id: { $in: mutualExpenseIds } } as Filter<ExpenseDoc>,
      { $set: { archivedAt: now } }
    )
  }
  if (activeSettlementIds.length > 0) {
    await settlementCol.updateMany(
      { userId, groupId, id: { $in: activeSettlementIds } } as Filter<SettlementDoc>,
      { $set: { archivedAt: now } }
    )
  }
  await touchGroup(userId, groupId)
  return 'ok'}

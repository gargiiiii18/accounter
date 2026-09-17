import type { Group, GroupInput, Expense, Settlement } from './types'

// Thin typed fetch client that replaces the old IndexedDB storage layer.
// All requests hit Clerk-protected API routes; a 401 means the user is signed out.

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (res.status === 401) {
    throw new ApiError('You must be signed in to do that.', 401)
  }
  if (res.status === 404) {
    return null as T
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status)
  }

  // 204 No Content (DELETE) and empty responses have no body to parse
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null as T
  }

  return res.json()
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  // Groups
  async getGroups(): Promise<Group[]> {
    return request('/api/groups')
  },

  async getGroup(id: string): Promise<Group | null> {
    return request(`/api/groups/${id}`)
  },

  async getGroupData(id: string): Promise<{ group: Group; expenses: Expense[]; settlements: Settlement[] }> {
    return request(`/api/groups/${id}/data`)
  },

  async createGroup(group: GroupInput): Promise<Group> {
    return request('/api/groups', { method: 'POST', body: json(group) })
  },

  async updateGroup(id: string, updates: { name?: string; description?: string; members?: GroupInput['members'] }): Promise<Group | null> {
    return request(`/api/groups/${id}`, { method: 'PATCH', body: json(updates) })
  },

  async deleteGroup(id: string): Promise<void> {
    await request(`/api/groups/${id}`, { method: 'DELETE' })
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<Group | null> {
    return request(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' })
  },

  // Expenses
  async getExpenses(groupId: string): Promise<Expense[]> {
    return request(`/api/groups/${groupId}/expenses`)
  },

  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    return request(`/api/groups/${expense.groupId}/expenses`, { method: 'POST', body: json(expense) })
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    return request(`/api/expenses/${id}`, { method: 'PATCH', body: json(updates) })
  },

  async deleteExpense(id: string): Promise<void> {
    await request(`/api/expenses/${id}`, { method: 'DELETE' })
  },

  // Settlements
  async getSettlements(groupId: string): Promise<Settlement[]> {
    return request(`/api/groups/${groupId}/settlements`)
  },

  async createSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement> {
    return request(`/api/groups/${settlement.groupId}/settlements`, { method: 'POST', body: json(settlement) })
  },

  async deleteSettlement(id: string): Promise<void> {
    await request(`/api/settlements/${id}`, { method: 'DELETE' })
  },

  // Clears all expenses and settlements of a group once it is fully settled up
  async resetGroupBalances(groupId: string): Promise<void> {
    await request(`/api/groups/${groupId}/reset`, { method: 'DELETE' })
  },
}

'use client'

import { createContext, useContext, useReducer, useRef, useEffect, ReactNode, useCallback } from 'react'
import type { Group, GroupInput, Member, MemberInput, Expense, Settlement, Balance, SimplifiedDebt, GroupSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { calculateBalances, simplifyDebts, isPersonalExpense } from '@/lib/balance'

interface AppState {
  groups: Group[]
  currentGroup: Group | null
  expenses: Expense[]
  settlements: Settlement[]
  balances: Balance[]
  debts: SimplifiedDebt[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GROUPS'; payload: Group[] }
  | { type: 'ADD_GROUP'; payload: Group }
  | { type: 'UPDATE_GROUP'; payload: Group }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'SET_CURRENT_GROUP'; payload: Group | null }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_SETTLEMENTS'; payload: Settlement[] }
  | { type: 'ADD_SETTLEMENT'; payload: Settlement }
  | { type: 'DELETE_SETTLEMENT'; payload: string }
  | { type: 'ARCHIVE_GROUP_RECORDS'; payload: string }
  | { type: 'UNARCHIVE_GROUP_RECORDS'; payload: string }
  | { type: 'CLEAR_GROUP_DATA'; payload: string }
  | { type: 'RECALCULATE_BALANCES' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: action.payload ? null : state.error }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_GROUPS':
      return { ...state, groups: action.payload, loading: false }
    case 'ADD_GROUP':
      return { ...state, groups: [action.payload, ...state.groups] }
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(g => g.id === action.payload.id ? action.payload : g),
        currentGroup: state.currentGroup?.id === action.payload.id ? action.payload : state.currentGroup,
      }
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(g => g.id !== action.payload),
        currentGroup: state.currentGroup?.id === action.payload ? null : state.currentGroup,
      }
    case 'SET_CURRENT_GROUP':
      return { ...state, currentGroup: action.payload }
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload }
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] }
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) }
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) }
    case 'SET_SETTLEMENTS':
      return { ...state, settlements: action.payload }
    case 'ADD_SETTLEMENT':
      return { ...state, settlements: [action.payload, ...state.settlements] }
    case 'DELETE_SETTLEMENT':
      return { ...state, settlements: state.settlements.filter(s => s.id !== action.payload) }
    case 'ARCHIVE_GROUP_RECORDS': {
      // History is immutable: records are archived (kept as proof) instead of
      // deleted, and stop counting toward balances. Personal records (a
      // member's own payments) are kept until explicitly cleared.
      const now = new Date().toISOString()
      return {
        ...state,
        expenses: state.expenses.map(e =>
          e.groupId === action.payload && !e.archivedAt && !isPersonalExpense(e)
            ? { ...e, archivedAt: now }
            : e
        ),
        settlements: state.settlements.map(s =>
          s.groupId === action.payload && !s.archivedAt
            ? { ...s, archivedAt: now }
            : s
        ),
      }
    }
    case 'UNARCHIVE_GROUP_RECORDS': {
      return {
        ...state,
        expenses: state.expenses.map(e =>
          e.groupId === action.payload && e.archivedAt
            ? { ...e, archivedAt: undefined }
            : e
        ),
        settlements: state.settlements.map(s =>
          s.groupId === action.payload && s.archivedAt
            ? { ...s, archivedAt: undefined }
            : s
        ),
      }
    }
    case 'CLEAR_GROUP_DATA':
      return {
        ...state,
        expenses: state.expenses.filter(e => e.groupId !== action.payload),
        settlements: state.settlements.filter(s => s.groupId !== action.payload),
      }
    case 'RECALCULATE_BALANCES': {
      const balances = calculateBalances(state.expenses, state.currentGroup?.members || [], state.settlements)
      const debts = simplifyDebts(balances)
      return { ...state, balances, debts }
    }
    default:
      return state
  }
}

const initialState: AppState = {
  groups: [],
  currentGroup: null,
  expenses: [],
  settlements: [],
  balances: [],
  debts: [],
  loading: true,
  error: null,
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
  loadGroups: () => Promise<void>
  loadAllGroupsData: () => Promise<void>
  loadGroupData: (groupId: string) => Promise<void>
  createGroup: (group: GroupInput) => Promise<Group>
  updateGroup: (id: string, updates: { name?: string; description?: string; members?: (Member | MemberInput)[] }) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  removeGroupMember: (groupId: string, memberId: string) => Promise<void>
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  createSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>) => Promise<Settlement>
  deleteSettlement: (id: string) => Promise<void>
  resetGroupBalances: (groupId: string) => Promise<void>
  getGroupSummary: (group: Group) => GroupSummary
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Mirrors the latest state so delayed operations can re-verify their
  // preconditions against fresh data instead of a stale closure.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // How long the settled-up state (and the rounding-leftover notice) stays
  // visible before the balances are auto-refreshed.
  const AUTO_RESET_DELAY_MS = 8000

  // Auto-refresh: as soon as every member of a group is settled up (within a
  // 0.01 rounding tolerance - a leftover cent can exist because expenses
  // cannot always be divided exactly evenly), the group's history is cleared
  // so all Paid/Owed/Net fields return to zero instantly.
  const autoResetIfSettled = async (groupId: string, nextExpenses: Expense[], nextSettlements: Settlement[], groupOverride?: Group) => {
    const group = groupOverride
      ?? (state.currentGroup?.id === groupId
        ? state.currentGroup
        : state.groups.find(g => g.id === groupId))
    if (!group) return
    const groupExpenses = nextExpenses.filter(e => e.groupId === groupId)
    const groupSettlements = nextSettlements.filter(s => s.groupId === groupId)
    if (groupExpenses.length === 0 && groupSettlements.length === 0) return
    const isSettledUp = calculateBalances(groupExpenses, group.members, groupSettlements)
      .every(balance => Math.abs(balance.net) <= 0.01)
    if (!isSettledUp) return

    // Only clear when there are active mutual records to archive; personal
    // records (a member's own payments) are kept until explicitly cleared.
    const hasActiveMutualRecords =
      groupExpenses.some(e => !e.archivedAt && !isPersonalExpense(e)) ||
      groupSettlements.some(s => !s.archivedAt)
    if (!hasActiveMutualRecords) return

    // Give the user a moment to see the settled-up state and the rounding
    // leftover notice before balances are cleared (records are archived as proof, never deleted).
    await new Promise(resolve => setTimeout(resolve, AUTO_RESET_DELAY_MS))

    // Re-verify against the latest state: the user may have added or changed
    // data while the delay was running, in which case we do nothing.
    const latest = stateRef.current
    const latestExpenses = latest.expenses.filter(e => e.groupId === groupId)
    const latestSettlements = latest.settlements.filter(s => s.groupId === groupId)
    if (latestExpenses.length === 0 && latestSettlements.length === 0) return
    const stillHasMutualRecords =
      latestExpenses.some(e => !e.archivedAt && !isPersonalExpense(e)) ||
      latestSettlements.some(s => !s.archivedAt)
    if (!stillHasMutualRecords) return
    const stillSettled = calculateBalances(latestExpenses, group.members, latestSettlements)
      .every(balance => Math.abs(balance.net) <= 0.01)
    if (!stillSettled) return

    try {
      await api.resetGroupBalances(groupId)
      dispatch({ type: 'ARCHIVE_GROUP_RECORDS', payload: groupId })
      dispatch({ type: 'RECALCULATE_BALANCES' })
    } catch {
      // Best-effort: keep the data as-is if the server refuses the reset
    }
  }

  const loadGroups = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const groups = await api.getGroups()
      dispatch({ type: 'SET_GROUPS', payload: groups })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load groups' })
    }
  }, [])

  const loadGroupData = useCallback(async (groupId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const data = await api.getGroupData(groupId)
      dispatch({ type: 'SET_CURRENT_GROUP', payload: data.group })
      dispatch({ type: 'SET_EXPENSES', payload: data.expenses })
      dispatch({ type: 'SET_SETTLEMENTS', payload: data.settlements })
      dispatch({ type: 'RECALCULATE_BALANCES' })
      dispatch({ type: 'SET_LOADING', payload: false })
      // If the group is already fully settled up (e.g. all settlements were
      // recorded earlier), reset its balances right away so Paid/Owed/Net
      // come back as zero instead of stale historical amounts.
      void autoResetIfSettled(groupId, data.expenses, data.settlements, data.group)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load group data' })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Loads every group together with its expenses and settlements so that the
  // dashboard can show real summaries instead of 0 values while data is loading.
  const loadAllGroupsData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const groups = await api.getGroups()
      if (groups.length === 0) {
        dispatch({ type: 'SET_GROUPS', payload: [] })
        dispatch({ type: 'SET_EXPENSES', payload: [] })
        dispatch({ type: 'SET_SETTLEMENTS', payload: [] })
        dispatch({ type: 'SET_CURRENT_GROUP', payload: null })
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }
      const results = await Promise.all(groups.map(group => api.getGroupData(group.id)))
      const allExpenses = results.flatMap(data => data?.expenses ?? [])
      const allSettlements = results.flatMap(data => data?.settlements ?? [])
      dispatch({ type: 'SET_GROUPS', payload: groups })
      dispatch({ type: 'SET_EXPENSES', payload: allExpenses })
      dispatch({ type: 'SET_SETTLEMENTS', payload: allSettlements })
      dispatch({ type: 'SET_CURRENT_GROUP', payload: null })
      dispatch({ type: 'RECALCULATE_BALANCES' })
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load groups' })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const createGroup = async (group: GroupInput) => {
    const newGroup = await api.createGroup(group)
    dispatch({ type: 'ADD_GROUP', payload: newGroup })
    return newGroup
  }

  const updateGroup = async (id: string, updates: { name?: string; description?: string; members?: (Member | MemberInput)[] }) => {
    const updated = await api.updateGroup(id, updates)
    if (updated) {
      dispatch({ type: 'UPDATE_GROUP', payload: updated })
      dispatch({ type: 'RECALCULATE_BALANCES' })
    }
  }

  const deleteGroup = async (id: string) => {
    await api.deleteGroup(id)
    dispatch({ type: 'DELETE_GROUP', payload: id })
    // Also drop the deleted group's expenses and settlements from state
    dispatch({ type: 'CLEAR_GROUP_DATA', payload: id })
    dispatch({ type: 'RECALCULATE_BALANCES' })
  }

  const removeGroupMember = async (groupId: string, memberId: string) => {
    const updated = await api.removeGroupMember(groupId, memberId)
    if (updated) {
      dispatch({ type: 'UPDATE_GROUP', payload: updated })
      dispatch({ type: 'RECALCULATE_BALANCES' })
    }
  }

  const createExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense = await api.createExpense(expense)
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense })
    dispatch({ type: 'RECALCULATE_BALANCES' })
    return newExpense
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await api.updateExpense(id, updates)
    if (updated) {
      dispatch({ type: 'UPDATE_EXPENSE', payload: updated })
      dispatch({ type: 'RECALCULATE_BALANCES' })
      void autoResetIfSettled(updated.groupId, state.expenses.map(e => e.id === updated.id ? updated : e), state.settlements)
    }
  }

  const deleteExpense = async (id: string) => {
    await api.deleteExpense(id)
    dispatch({ type: 'DELETE_EXPENSE', payload: id })
    dispatch({ type: 'RECALCULATE_BALANCES' })
    const deleted = state.expenses.find(e => e.id === id)
    if (deleted) void autoResetIfSettled(deleted.groupId, state.expenses.filter(e => e.id !== id), state.settlements)
  }

  const createSettlement = async (settlement: Omit<Settlement, 'id' | 'createdAt'>) => {
    const newSettlement = await api.createSettlement(settlement)
    dispatch({ type: 'ADD_SETTLEMENT', payload: newSettlement })
    dispatch({ type: 'RECALCULATE_BALANCES' })
    // Fire-and-forget: the auto-reset intentionally waits a few seconds before
    // clearing the history, and must not block the UI (e.g. dialog closing).
    void autoResetIfSettled(settlement.groupId, state.expenses, [...state.settlements, newSettlement])
    return newSettlement
  }

  const deleteSettlement = async (id: string) => {
    await api.deleteSettlement(id)
    const deleted = state.settlements.find(s => s.id === id)
    dispatch({ type: 'DELETE_SETTLEMENT', payload: id })
    if (deleted) dispatch({ type: 'UNARCHIVE_GROUP_RECORDS', payload: deleted.groupId })
    dispatch({ type: 'RECALCULATE_BALANCES' })
  }

  // Only succeeds once the group is fully settled up (verified server-side):
  // removes every expense and settlement so Paid/Owed/Net reset to zero.
  const resetGroupBalances = async (groupId: string) => {
    await api.resetGroupBalances(groupId)
    dispatch({ type: 'ARCHIVE_GROUP_RECORDS', payload: groupId })
    dispatch({ type: 'RECALCULATE_BALANCES' })
  }

  const getGroupSummary = (group: Group): GroupSummary => {
    const groupExpenses = state.expenses.filter(e => e.groupId === group.id)
    const groupSettlements = state.settlements.filter(s => s.groupId === group.id)
    const totalExpenses = groupExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalSettled = groupSettlements.reduce((sum, s) => sum + s.amount, 0)
    return {
      group,
      totalExpenses,
      totalSettled,
      unsettledAmount: totalExpenses - totalSettled,
      memberCount: group.members.length,
    }
  }

  // Each page triggers its own data loading: the dashboard loads every group's
  // data via loadAllGroupsData, the group detail page loads its group via
  // loadGroupData. This avoids rendering placeholder 0 summaries mid-fetch.

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        loadGroups,
        loadAllGroupsData,
        loadGroupData,
        createGroup,
        updateGroup,
        deleteGroup,
        removeGroupMember,
        createExpense,
        updateExpense,
        deleteExpense,
        createSettlement,
        deleteSettlement,
        resetGroupBalances,
        getGroupSummary,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, Plus, UserPlus, Receipt, Scale, CheckSquare, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Group } from '@/lib/types'
import { MemberAvatarStack } from './MemberAvatar'
import { StatBox } from './StatBox'

export type DetailTab = 'expenses' | 'balances' | 'settle' | 'history'

const TABS: { value: DetailTab; label: string; icon: typeof Receipt }[] = [
  { value: 'expenses', label: 'Expenses', icon: Receipt },
  { value: 'balances', label: 'Balances', icon: Scale },
  { value: 'settle', label: 'Settle Up', icon: CheckSquare },
  { value: 'history', label: 'History', icon: History },
]

interface DetailShellProps {
  group: Group
  groupId: string
  totalSpent: number
  youreOwed: number
  youOwe: number
  expenseCount: number
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onAddExpense: () => void
  onAddMember: () => void
  onOpenSettings: () => void
  headerActions?: ReactNode
  sidebar?: ReactNode
  children: ReactNode
}

/**
 * Splitwise-style detail page: sticky header (back, initials, name, avatars,
 * + Add), stat tiles, pill tab bar, then a two-column layout (main content
 * left, sidebar right) on desktop, stacking on mobile.
 */
export function DetailShell(props: DetailShellProps) {
  const { group, totalSpent, youreOwed, youOwe, expenseCount } = props
  const { activeTab, onTabChange, onAddExpense, onAddMember, onOpenSettings, headerActions, sidebar, children } = props
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#c0cdd9] shadow-sm">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          {/* Row 1: back, initials, name, avatars, actions */}
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0" aria-label="Back to groups">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-[#5a7089] hover:text-[#1a2332]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-xl bg-[#eef3f9] flex items-center justify-center text-sm font-extrabold tracking-wide text-[#1a2332] shrink-0">
              {group.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-[#1a2332] truncate leading-tight">
                {group.name}
              </h1>
              <p className="text-xs text-[#5a7089] truncate">
                {group.description || <>{group.members.length} member{group.members.length === 1 ? '' : 's'} · {expenseCount} expense{expenseCount === 1 ? '' : 's'}</>}
              </p>
            </div>
            <div className="hidden sm:block shrink-0">
              <MemberAvatarStack members={group.members} max={5} size="sm" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <Button size="sm" className="rounded-xl h-9 px-4 font-semibold" onClick={onAddMember}>
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Tabs bar */}
      <div className="bg-white border-b border-[#c0cdd9]">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Total Spent" value={formatCurrency(totalSpent)} tone="neutral" />
            <StatBox label="You're Owed" value={formatCurrency(youreOwed)} tone="green" />
            <StatBox label="You Owe" value={formatCurrency(youOwe)} tone="red" />
          </div>
          <div className="mt-4 flex gap-1 rounded-xl bg-[#eef3f9] p-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={
                    isActive
                      ? 'flex-1 min-w-0 flex items-center justify-center gap-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold px-3 py-2.5 whitespace-nowrap transition-colors'
                      : 'flex-1 min-w-0 flex items-center justify-center gap-2 rounded-lg text-[#5a7089] hover:text-[#1a2332] hover:bg-white text-sm font-semibold px-3 py-2.5 whitespace-nowrap transition-colors'
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content area - two column on desktop */}
      <div className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {children}
            </div>
            {/* Sidebar */}
            {sidebar && (
              <div className="w-full lg:w-80 shrink-0 space-y-4">
                {sidebar}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      >
        Group settings
      </button>

      {/* Floating action button for mobile - Add Expense */}
      <button
        type="button"
        onClick={onAddExpense}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#3b82f6] text-white shadow-lg hover:bg-[#2563eb] transition-colors flex items-center justify-center"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}

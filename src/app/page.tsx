import { auth } from '@clerk/nextjs/server'
import { GroupsDashboard } from '@/components/dashboard/GroupsDashboard'
import { AuthControls } from '@/components/auth/AuthControls'

export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) {
    return (
      <main className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Expense Tracker</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-10 text-lg">
          Track shared expenses with friends and groups. Sign in to view your groups or create a new account to get started.
        </p>
        <div className="flex justify-center">
          <AuthControls />
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-6 py-10">
      <GroupsDashboard />
    </main>
  )
}
import { auth } from '@clerk/nextjs/server'
import { GroupDetail } from '@/components/dashboard/GroupDetail'
import { AuthControls } from '@/components/auth/AuthControls'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GroupPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    return (
      <main className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Sign in required</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8">
          You need to be signed in to view this group.
        </p>
        <div className="flex justify-center">
          <AuthControls />
        </div>
      </main>
    )
  }

  const { id } = await params
  return (
        <main className="container mx-auto px-6 py-10 h-[calc(100vh-4rem)] overflow-y-auto">
      <GroupDetail groupId={id} />
    </main>
  )
}
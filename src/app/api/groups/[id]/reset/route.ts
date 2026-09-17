import { auth } from '@clerk/nextjs/server'
import { resetGroupBalances } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const result = await resetGroupBalances(userId, id)
    if (result === 'not-found') {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    if (result === 'not-settled') {
      return Response.json({ error: 'Balances can only be refreshed once everyone is settled up' }, { status: 400 })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/groups/[id]/reset failed:', error)
    return Response.json({ error: 'Failed to refresh balances' }, { status: 500 })
  }
}

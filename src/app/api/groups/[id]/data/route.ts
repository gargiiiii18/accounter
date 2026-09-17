import { auth } from '@clerk/nextjs/server'
import { getGroup, listExpenses, listSettlements } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const group = await getGroup(userId, id)
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }

    const [expenses, settlements] = await Promise.all([
      listExpenses(userId, id),
      listSettlements(userId, id),
    ])

    return Response.json({ group, expenses, settlements })
  } catch (error) {
    console.error('GET /api/groups/[id]/data failed:', error)
    return Response.json({ error: 'Failed to load group data' }, { status: 500 })
  }
}
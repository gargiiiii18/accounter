import { auth } from '@clerk/nextjs/server'
import { deleteSettlement, unarchiveGroupRecords } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const settlement = await deleteSettlement(userId, id)
    if (!settlement) {
      return Response.json({ error: 'Settlement not found' }, { status: 404 })
    }
    await unarchiveGroupRecords(userId, settlement.groupId)
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/settlements/[id] failed:', error)
    return Response.json({ error: 'Failed to delete settlement' }, { status: 500 })
  }
}

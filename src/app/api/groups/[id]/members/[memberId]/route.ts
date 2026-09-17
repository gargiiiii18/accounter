import { auth } from '@clerk/nextjs/server'
import { removeGroupMember } from '@/lib/repositories'

type Params = { params: Promise<{ id: string; memberId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, memberId } = await params
  try {
    const group = await removeGroupMember(userId, id, memberId)
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    return Response.json(group)
  } catch (error) {
    console.error('DELETE /api/groups/[id]/members/[memberId] failed:', error)
    return Response.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
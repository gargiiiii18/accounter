import { auth } from '@clerk/nextjs/server'
import { groupSchema } from '@/lib/validation'
import { deleteGroup, getGroup, updateGroup } from '@/lib/repositories'

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
    return Response.json(group)
  } catch (error) {
    console.error('GET /api/groups/[id] failed:', error)
    return Response.json({ error: 'Failed to load group' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const parsed = groupSchema.partial().safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid update' }, { status: 400 })
    }
    const group = await updateGroup(userId, id, parsed.data)
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    return Response.json(group)
  } catch (error) {
    console.error('PATCH /api/groups/[id] failed:', error)
    return Response.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const deleted = await deleteGroup(userId, id)
    if (!deleted) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/groups/[id] failed:', error)
    return Response.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}

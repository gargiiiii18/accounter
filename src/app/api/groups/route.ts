import { auth } from '@clerk/nextjs/server'
import { groupSchema } from '@/lib/validation'
import { createGroup, listGroups } from '@/lib/repositories'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return Response.json(await listGroups(userId))
  } catch (error) {
    console.error('GET /api/groups failed:', error)
    return Response.json({ error: 'Failed to load groups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = groupSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid group' }, { status: 400 })
    }
    const group = await createGroup(userId, parsed.data)
    return Response.json(group, { status: 201 })
  } catch (error) {
    console.error('POST /api/groups failed:', error)
    return Response.json({ error: 'Failed to create group' }, { status: 500 })
  }
}

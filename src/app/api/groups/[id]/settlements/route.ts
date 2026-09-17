import { auth } from '@clerk/nextjs/server'
import { settlementSchema } from '@/lib/validation'
import { createSettlement, listSettlements } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    return Response.json(await listSettlements(userId, id))
  } catch (error) {
    console.error('GET /api/groups/[id]/settlements failed:', error)
    return Response.json({ error: 'Failed to load settlements' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const parsed = settlementSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid settlement' }, { status: 400 })
    }
    if (parsed.data.groupId !== id) {
      return Response.json({ error: 'Group id mismatch' }, { status: 400 })
    }
    const settlement = await createSettlement(userId, parsed.data)
    if (!settlement) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    return Response.json(settlement, { status: 201 })
  } catch (error) {
    console.error('POST /api/groups/[id]/settlements failed:', error)
    return Response.json({ error: 'Failed to create settlement' }, { status: 500 })
  }
}

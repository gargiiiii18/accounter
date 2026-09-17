import { auth } from '@clerk/nextjs/server'
import { expenseSchema } from '@/lib/validation'
import { createExpense, listExpenses } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    return Response.json(await listExpenses(userId, id))
  } catch (error) {
    console.error('GET /api/groups/[id]/expenses failed:', error)
    return Response.json({ error: 'Failed to load expenses' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const parsed = expenseSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid expense' }, { status: 400 })
    }
    if (parsed.data.groupId !== id) {
      return Response.json({ error: 'Group id mismatch' }, { status: 400 })
    }
    const expense = await createExpense(userId, {
      ...parsed.data,
      splits: parsed.data.splits.map(s => ({
        memberId: s.memberId,
        amount: s.amount ?? 0,
        percentage: s.percentage,
      })),
    })
    if (!expense) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    return Response.json(expense, { status: 201 })
  } catch (error) {
    console.error('POST /api/groups/[id]/expenses failed:', error)
    return Response.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}

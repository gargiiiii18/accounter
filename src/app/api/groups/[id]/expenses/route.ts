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
    // Percentage splits must carry the computed amount so balances (Paid/Owed)
    // can be derived from splits; never trust the client to have set it.
    const normalizedSplits = parsed.data.splitType === 'percentage'
      ? parsed.data.splits.map(s => ({
          memberId: s.memberId,
          amount: Math.round((parsed.data.amount * (s.percentage ?? 0)) / 100 * 100) / 100,
          percentage: s.percentage,
        }))
      : parsed.data.splits.map(s => ({
          memberId: s.memberId,
          amount: s.amount ?? 0,
          percentage: s.percentage,
        }))
    const expense = await createExpense(userId, {
      ...parsed.data,
      splits: normalizedSplits,
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

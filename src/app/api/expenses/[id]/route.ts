import { auth } from '@clerk/nextjs/server'
import { updateExpense, deleteExpense } from '@/lib/repositories'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const updates = await request.json()
    if (typeof updates !== 'object' || updates === null) {
      return Response.json({ error: 'Invalid update' }, { status: 400 })
    }
    const expense = await updateExpense(userId, id, updates)
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 })
    }
    return Response.json(expense)
  } catch (error) {
    console.error('PATCH /api/expenses/[id] failed:', error)
    return Response.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const expense = await deleteExpense(userId, id)
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] failed:', error)
    return Response.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}

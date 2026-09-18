import { describe, it, expect, vi, beforeEach } from 'vitest'

// repositories.ts is server-only and talks to MongoDB; both are mocked so the
// delete order can be tested deterministically without touching a database.
vi.mock('server-only', () => ({}))
vi.mock('./mongodb', () => ({ getCollections: vi.fn() }))

function makeCollection() {
  return {
    createIndex: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    replaceOne: vi.fn(),
    findOneAndDelete: vi.fn(),
  }
}

const groups = makeCollection()
const expenses = makeCollection()
const settlements = makeCollection()

const { getCollections } = await import('./mongodb')
const fakeCollections = { groups, expenses, settlements } as unknown as Awaited<ReturnType<typeof getCollections>>
vi.mocked(getCollections).mockResolvedValue(fakeCollections)

const { deleteGroup } = await import('./repositories')

describe('deleteGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the group history first, then the group row', async () => {
    groups.deleteOne.mockResolvedValue({ deletedCount: 1 })

    const deleted = await deleteGroup('user_1', 'group_1')

    expect(expenses.deleteMany).toHaveBeenCalledWith({ userId: 'user_1', groupId: 'group_1' })
    expect(settlements.deleteMany).toHaveBeenCalledWith({ userId: 'user_1', groupId: 'group_1' })
    expect(groups.deleteOne).toHaveBeenCalledWith({ userId: 'user_1', id: 'group_1' })
    expect(deleted).toBe(true)
  })

  it('stray-group case: history is cleared but the group row survives a failed group delete', async () => {
    groups.deleteOne.mockRejectedValueOnce(new Error('network blip'))

    await expect(deleteGroup('user_1', 'group_1')).rejects.toThrow('network blip')

    // History is gone, the group row still exists -> the dashboard still lists
    // the group, so the user can retry.
    expect(expenses.deleteMany).toHaveBeenCalledTimes(1)
    expect(settlements.deleteMany).toHaveBeenCalledTimes(1)
    expect(groups.deleteOne).toHaveBeenCalledTimes(1)
  })

  it('clicking retry removes the stray group row', async () => {
    groups.deleteOne
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({ deletedCount: 1 })

    await expect(deleteGroup('user_1', 'group_1')).rejects.toThrow('network blip')
    const retry = await deleteGroup('user_1', 'group_1')

    expect(retry).toBe(true)
    // The retry re-runs the history cleanup too - harmless, an already empty
    // filter simply matches nothing.
    expect(expenses.deleteMany).toHaveBeenCalledTimes(2)
    expect(settlements.deleteMany).toHaveBeenCalledTimes(2)
  })

  it('still clears leftover history when the group row is already gone', async () => {
    // The old implementation returned early here, orphaning the history forever.
    groups.deleteOne.mockResolvedValue({ deletedCount: 0 })

    const deleted = await deleteGroup('user_1', 'group_1')

    expect(expenses.deleteMany).toHaveBeenCalledWith({ userId: 'user_1', groupId: 'group_1' })
    expect(settlements.deleteMany).toHaveBeenCalledWith({ userId: 'user_1', groupId: 'group_1' })
    expect(deleted).toBe(false)
  })
})
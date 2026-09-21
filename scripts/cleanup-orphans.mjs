// Maintenance: removes orphaned history - expenses/settlements whose group no
// longer exists - left behind by earlier partial group deletions.
//
// Dry run (default, only reports):
//   npm run cleanup:orphans
// Actually delete:
//   npm run cleanup:orphans -- --yes
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key]) continue
      process.env[key] = rawValue.trim().replace(/^["\']|["\']$/g, '')
    }
  } catch {
    // .env.local is optional when the variables are already exported
  }
}

loadEnvLocal()

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is not set. Add it to .env.local (see .env.example).')
  process.exit(1)
}

const apply = process.argv.includes('--yes')
const dbName = process.env.MONGODB_DB || 'accounter'
const client = new MongoClient(uri)

async function countOrDelete(collectionName, filter) {
  const collection = client.db(dbName).collection(collectionName)
  if (!apply) return collection.countDocuments(filter)
  const result = await collection.deleteMany(filter)
  return result.deletedCount
}

await client.connect()

const groups = await client
  .db(dbName)
  .collection('groups')
  .find({}, { projection: { id: 1, userId: 1 } })
  .toArray()

const groupIdsByUser = new Map()
for (const group of groups) {
  if (!groupIdsByUser.has(group.userId)) groupIdsByUser.set(group.userId, [])
  groupIdsByUser.get(group.userId).push(group.id)
}

let expenses = 0
let settlements = 0

// 1. Records whose group no longer exists (checked per user)
for (const [userId, groupIds] of groupIdsByUser) {
  expenses += await countOrDelete('expenses', { userId, groupId: { $nin: groupIds } })
  settlements += await countOrDelete('settlements', { userId, groupId: { $nin: groupIds } })
}

// 2. Records belonging to users who have no groups left at all
const candidateUserIds = [
  ...new Set([
    ...(await client.db(dbName).collection('expenses').distinct('userId')),
    ...(await client.db(dbName).collection('settlements').distinct('userId')),
  ]),
]
for (const userId of candidateUserIds.filter(id => !groupIdsByUser.has(id))) {
  expenses += await countOrDelete('expenses', { userId })
  settlements += await countOrDelete('settlements', { userId })
}

// 3. Repair percentage-split expenses stored with zero amounts (older bug):
//    recompute each split amount from the expense total and percentages.
const broken = await client.db(dbName).collection('expenses')
  .find({ splitType: 'percentage' })
  .toArray()
let repaired = 0
for (const expense of broken) {
  if (!expense.splits || !expense.splits.every(s => !s.amount)) continue
  const sumPct = expense.splits.reduce((sum, s) => sum + (s.percentage || 0), 0)
  if (Math.abs(sumPct - 100) > 0.01) continue // only repair well-formed splits
  const splits = expense.splits.map(s => ({
    ...s,
    amount: Math.round((expense.amount * (s.percentage || 0)) / 100 * 100) / 100,
  }))
  if (apply) {
    await client.db(dbName).collection('expenses').updateOne({ _id: expense._id }, { $set: { splits } })
  }
  repaired++
}
await client.close()

console.log(
  apply
    ? 'Removed ' + expenses + ' orphaned expense(s) and ' + settlements + ' orphaned settlement(s). Repaired ' + repaired + ' percentage-split expense(s).'
    : 'Found ' + expenses + ' orphaned expense(s) and ' + settlements + ' orphaned settlement(s). ' + repaired + ' percentage-split expense(s) would be repaired. Re-run with "-- --yes" to apply.'
)
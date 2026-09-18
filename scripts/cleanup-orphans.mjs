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
const dbName = process.env.MONGODB_DB || 'expense-tracker'
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

await client.close()

console.log(
  apply
    ? 'Removed ' + expenses + ' orphaned expense(s) and ' + settlements + ' orphaned settlement(s).'
    : 'Found ' + expenses + ' orphaned expense(s) and ' + settlements + ' orphaned settlement(s). Re-run with "-- --yes" to remove them.'
)
// Creates a "stray group" in the database: a group row whose history was already
// removed - exactly the state left behind when a group delete fails after the
// history was cleared. Use it to verify the delete flow against the real UI.
//
// Usage:
//   npm run repro:stray-group             # create the stray group
//   npm run repro:stray-group -- --remove # remove all stray test groups
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

const GROUP_NAME = 'ZZ Stray group test'

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

const dbName = process.env.MONGODB_DB || 'accounter'
const remove = process.argv.includes('--remove')
const client = new MongoClient(uri)

await client.connect()
const db = client.db(dbName)
const groups = db.collection('groups')

if (remove) {
  const result = await groups.deleteMany({ name: GROUP_NAME })
  console.log('Removed ' + result.deletedCount + ' stray test group(s).')
  await client.close()
  process.exit(0)
}

// Borrow the userId of an existing group so the stray row shows up for the
// same signed-in account in the dashboard.
const existing = await groups.findOne({}, { projection: { userId: 1 } })
if (!existing || !existing.userId) {
  console.error('No existing group found to borrow a userId from. Create a group in the app first.')
  await client.close()
  process.exit(1)
}

const now = new Date().toISOString()
const stray = {
  id: 'stray-test-' + Date.now(),
  userId: existing.userId,
  name: GROUP_NAME,
  description: 'Test row - its history is already gone, as after a partial delete',
  members: [],
  createdAt: now,
  updatedAt: now,
}

await groups.insertOne(stray)

// Make sure no history is attached: this is the "stray group" state.
const removedExpenses = await db.collection('expenses').deleteMany({ userId: stray.userId, groupId: stray.id })
const removedSettlements = await db.collection('settlements').deleteMany({ userId: stray.userId, groupId: stray.id })

console.log('Created stray group "' + stray.name + '" (id: ' + stray.id + ') with no history.')
console.log('Leftover history cleaned for that id: ' + removedExpenses.deletedCount + ' expense(s), ' + removedSettlements.deletedCount + ' settlement(s).')
console.log('')
console.log('How to test:')
console.log('  1. Open the dashboard - "' + stray.name + '" is listed.')
console.log('  2. Click its trash icon and confirm.')
console.log('  3. Check MongoDB Atlas: the row is gone from the groups collection.')
console.log('')
console.log('Remove it without the UI: npm run repro:stray-group -- --remove')

await client.close()
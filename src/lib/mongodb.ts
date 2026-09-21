import { MongoClient, type Db } from 'mongodb'

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function connect(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    // Don't throw at module load (breaks `next build` page-data collection);
    // fail only when the DB is actually used.
    const rejected = Promise.reject(
      new Error('MONGODB_URI is not set. Add it to .env.local (see .env.example).')
    )
    rejected.catch(() => {}) // avoid unhandled rejection warnings
    return rejected
  }
  return new MongoClient(process.env.MONGODB_URI).connect()
}

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development, cache the client on the global object so HMR
  // doesn't create a new connection on every reload.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = connect()
}

export async function getDb(): Promise<Db> {
  const mongoClient = await clientPromise
  return mongoClient.db(process.env.MONGODB_DB || 'accounter')
}

export async function getCollections() {
  const db = await getDb()
  return {
    groups: db.collection('groups'),
    expenses: db.collection('expenses'),
    settlements: db.collection('settlements'),
  }
}

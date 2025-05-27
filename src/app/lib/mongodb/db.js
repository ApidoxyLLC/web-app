import mongoose from 'mongoose';

const connections = {}; // Cache of { [dbKey]: mongoose.Connection }

export async function dbConnect({dbKey, dbUri}) {
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);

  console.log(dbKey)
  // Return cached connection if it exists
  if (connections[dbKey]) {
    return connections[dbKey];
  }
  const conn =  await mongoose.createConnection(dbUri,{
    dbName: dbKey,
  }).asPromise();
  console.log(`✅ ${dbKey} database connected`);

  connections[dbKey] = conn;
  return conn;
} 
import mongoose from 'mongoose';

const connections = {}; // Cache of { [dbKey]: mongoose.Connection }

export async function dbConnect(dbKey, dbUri) {
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);

  // Return cached connection if it exists
  if (connections[dbKey]) {
    return connections[dbKey];
  }
  const conn =  await mongoose.connect(dbUri,{
    dbName: dbKey,
  });
  console.log("✅ MongoDB connected");

  connections[dbKey] = conn;
  return conn;
}
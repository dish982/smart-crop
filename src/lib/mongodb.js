import mongoose from 'mongoose';

import dns from 'node:dns';

// Configure DNS fallback servers once inside Node runtime environment
try {
  if (typeof window === 'undefined' && dns.setServers) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  }
} catch (error) {
  console.warn('DNS setServers warning:', error.message);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}



let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
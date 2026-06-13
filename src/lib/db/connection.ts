import mongoose from 'mongoose';
import { MONGODB_URI } from '@/lib/constants';

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection: typeof mongoose | null;
}

const cached: { conn: typeof mongoose | null } = { conn: null };

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    cached.conn = connection;
    console.log('[MongoDB] Connected:', connection.connection.host);
    return connection;
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
  }
}

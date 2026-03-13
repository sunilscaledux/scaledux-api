import mongoose from 'mongoose';
import { Log } from '@services/loggerService';

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    Log.warn('MONGODB_URI not set; database will be disabled.');
    return;
  }
  try {
    await mongoose.connect(uri);
    isConnected = true;
    Log.info('MongoDB connected');
  } catch (error) {
    Log.error('MongoDB connection error', { error });
    throw error;
  }
}

export function mongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

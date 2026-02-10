import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set; database will be disabled.');
    return;
  }
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export function mongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

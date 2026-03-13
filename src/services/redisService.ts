import Redis from 'ioredis';
import redisConfig from '@config/redis';
import { Log } from '@services/loggerService';

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  Log.info('Redis connected successfully');
});

redisClient.on('error', (error) => {
  Log.error('Redis connection error', { error });
});

redisClient.on('ready', () => {
  Log.info('Redis is ready to accept commands');
  Log.info('Note: Set Redis maxmemory-policy to "noeviction" for BullMQ job safety');
});

redisClient.on('close', () => {
  Log.warn('Redis connection closed');
});

export default redisClient;

import Redis from 'ioredis';
import redisConfig from '@config/redis'
const redisClient = new Redis(redisConfig);

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redisClient.on('ready', () => {
  console.log('🚀 Redis is ready to accept commands');
});

redisClient.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

export default redisClient;
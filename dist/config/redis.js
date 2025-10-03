"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
};
// Create Redis client
const redisClient = new ioredis_1.default(redisConfig);
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
exports.default = redisClient;

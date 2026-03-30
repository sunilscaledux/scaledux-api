import path from 'path';

/**
 
 * Env: LOG_CHANNEL, LOG_LEVEL, LOG_PATH
 */
const LOG_CHANNEL = process.env.LOG_CHANNEL || 'stack';
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_PATH = process.env.LOG_PATH || path.join(process.cwd(), 'storage', 'logs');
const LOG_DAYS = parseInt(process.env.LOG_DAYS || '14', 10);

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug';

export interface LogChannelConfig {
  driver: 'single' | 'daily' | 'console' | 'stack';
  level?: LogLevel;
  path?: string;
  days?: number;
  channels?: string[];
}

export const loggingConfig = {
  default: LOG_CHANNEL,

  level: LOG_LEVEL as LogLevel,

  path: LOG_PATH,

  days: LOG_DAYS,

  channels: {
    stack: {
      driver: 'stack' as const,
      channels: ['daily', 'console'],
      level: LOG_LEVEL as LogLevel
    },

    single: {
      driver: 'single' as const,
      path: path.join(LOG_PATH, 'app.log'),
      level: LOG_LEVEL as LogLevel
    },

    daily: {
      driver: 'daily' as const,
      path: path.join(LOG_PATH, 'app'),
      level: LOG_LEVEL as LogLevel,
      days: LOG_DAYS
    },

    /** Console only. */
    console: {
      driver: 'console' as const,
      level: LOG_LEVEL as LogLevel
    },

    /** Worker daily log (separate from app). */
    worker: {
      driver: 'daily' as const,
      path: path.join('/logs/worker'),
      level: LOG_LEVEL as LogLevel,
      days: LOG_DAYS
    }
  } as Record<string, LogChannelConfig>
};

export default loggingConfig;

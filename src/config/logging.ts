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
  /** For daily: max days to keep (e.g. 14). */
  days?: number;
  /** For stack: channel names to combine. */
  channels?: string[];
}

export const loggingConfig = {
  /** Default channel name (e.g. 'stack', 'single', 'daily'). */
  default: LOG_CHANNEL,

  /** Default minimum level. */
  level: LOG_LEVEL as LogLevel,

  /** Directory for log files. */
  path: LOG_PATH,

  /** Days to keep when using daily channel. */
  days: LOG_DAYS,

  channels: {
    /** Combine multiple channels (e.g. write to file + console). */
    stack: {
      driver: 'stack' as const,
      channels: ['single', 'console'],
      level: LOG_LEVEL as LogLevel
    },

    /** Single file (e.g. storage/logs/app.log). */
    single: {
      driver: 'single' as const,
      path: path.join(LOG_PATH, 'app.log'),
      level: LOG_LEVEL as LogLevel
    },

    /** Daily rotating file (Laravel-style). */
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
      path: path.join(LOG_PATH+'/worker'),
      level: LOG_LEVEL as LogLevel,
      days: LOG_DAYS
    }
  } as Record<string, LogChannelConfig>
};

export default loggingConfig;

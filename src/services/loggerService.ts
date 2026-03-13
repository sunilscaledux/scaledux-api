import winston from 'winston';
import path from 'path';
import fs from 'fs';
import loggingConfig, { LogLevel } from '../config/logging';

function ensureLogDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const { format } = winston;

type LoggerInstance = winston.Logger;
const channelLoggers: Map<string, LoggerInstance> = new Map();

const defaultFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}${stackStr}`;
  })
);

function buildTransport(channelName: string): winston.transport[] {
  const channel = loggingConfig.channels[channelName];
  if (!channel) return [];

  if (channel.driver === 'stack') {
    const names = channel.channels || [];
    return names.flatMap((name) => buildTransport(name));
  }

  const level = channel.level || loggingConfig.level;
  const fmt = defaultFormat;

  if (channel.driver === 'console') {
    return [
      new winston.transports.Console({
        level,
        format: format.combine(format.colorize(), fmt)
      })
    ];
  }

  if (channel.driver === 'single' && channel.path) {
    ensureLogDir(channel.path);
    return [
      new winston.transports.File({ filename: channel.path, level, format: fmt })
    ];
  }

  if (channel.driver === 'daily' && channel.path) {
    try {
      const DailyRotateFile = require('winston-daily-rotate-file');
      const dirname = path.dirname(channel.path);
      const basename = path.basename(channel.path);
      ensureLogDir(path.join(dirname, basename));
      return [
        new DailyRotateFile({
          dirname,
          filename: basename + '-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: (channel as { days?: number }).days
            ? `${(channel as { days?: number }).days}d`
            : '14d',
          level,
          format: fmt
        })
      ];
    } catch {
      ensureLogDir(channel.path + '.log');
      return [
        new winston.transports.File({
          filename: channel.path + '.log',
          level,
          format: fmt
        })
      ];
    }
  }

  return [];
}

function getChannelLogger(channelName: string): LoggerInstance {
  let logger = channelLoggers.get(channelName);
  if (logger) return logger;

  const transports = buildTransport(channelName);
  if (transports.length === 0) {
    transports.push(
      new winston.transports.Console({
        format: format.combine(format.colorize(), defaultFormat)
      })
    );
  }

  logger = winston.createLogger({
    level: loggingConfig.level,
    format: defaultFormat,
    transports
  });
  channelLoggers.set(channelName, logger);
  return logger;
}

function toMeta(context?: Record<string, unknown> | unknown): Record<string, unknown> {
  if (context === undefined) return {};
  if (typeof context === 'object' && context !== null && !Array.isArray(context)) return context as Record<string, unknown>;
  return { error: context };
}

function logLevel(level: string, message: string, context?: Record<string, unknown> | unknown): void {
  const logger = getChannelLogger(loggingConfig.default);
  logger.log(level, message, toMeta(context));
}

/**
 * Use Log.info(), Log.error(), Log.channel('single'), etc.
 */
export const Log = {
  /** Log at level (e.g. 'info', 'error'). Context can be object or caught error (unknown). */
  log(level: LogLevel | string, message: string, context?: Record<string, unknown> | unknown): void {
    logLevel(level, message, context);
  },

  info(message: string, context?: Record<string, unknown> | unknown): void {
    logLevel('info', message, context);
  },

  error(message: string, context?: Record<string, unknown> | unknown): void {
    logLevel('error', message, context);
  },

  warning(message: string, context?: Record<string, unknown> | unknown): void {
    logLevel('warn', message, context);
  },

  warn(message: string, context?: Record<string, unknown> | unknown): void {
    logLevel('warn', message, context);
  },

  debug(message: string, context?: Record<string, unknown> | unknown): void {
    logLevel('debug', message, context);
  },

  /** Get a logger for a specific channel (e.g. Log.channel('single')). */
  channel(name: string): LoggerInstance {
    return getChannelLogger(name);
  }
};

/** Default logger instance (default channel). Use Log.* . */
export const logger = getChannelLogger(loggingConfig.default);

export default Log;

import { Analytics } from './analytics';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Production-grade frontend logger.
 * - debug/info/warn: Only visible in development.
 * - error: Visible in development and production, and tracks to PostHog.
 */
class Logger {
  private log(level: LogLevel, message: string, ...args: any[]) {
    // In production, only log errors
    if (IS_PRODUCTION && level !== 'error') {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        
        // Integrate with PostHog for error tracking
        const errorObj = args.find(arg => arg instanceof Error) || new Error(message);
        Analytics.trackError(errorObj, message);
        break;
    }
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();

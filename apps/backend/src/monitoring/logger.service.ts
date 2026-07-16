import { Injectable, Logger as NestLogger } from '@nestjs/common';
import pino from 'pino';

/**
 * Structured JSON logging via Pino.
 * Every log includes timestamp, level, service context, and structured fields.
 */
@Injectable()
export class LoggerService extends NestLogger {
  private logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });

  log(message: string, context?: string, extra?: Record<string, any>): void {
    this.logger.info({ context, ...extra }, message);
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    extra?: Record<string, any>,
  ): void {
    this.logger.error({ context, stack: trace, ...extra }, message);
  }

  warn(message: string, context?: string, extra?: Record<string, any>): void {
    this.logger.warn({ context, ...extra }, message);
  }

  debug(message: string, context?: string, extra?: Record<string, any>): void {
    this.logger.debug({ context, ...extra }, message);
  }

  /**
   * Structured log for connection events
   */
  logConnection(
    status: 'connected' | 'disconnected' | 'reconnecting',
    service: string,
    extra?: Record<string, any>,
  ): void {
    const level = status === 'disconnected' ? 'warn' : 'info';
    this.logger[level](
      { service, status, ...extra },
      `${service} connection ${status}`,
    );
  }

  /**
   * Structured log for performance metrics
   */
  logPerformance(
    operation: string,
    durationMs: number,
    extra?: Record<string, any>,
  ): void {
    if (durationMs > 1000) {
      this.logger.warn(
        { operation, durationMs, ...extra },
        `Slow operation: ${operation}`,
      );
    } else {
      this.logger.debug(
        { operation, durationMs, ...extra },
        `Operation completed`,
      );
    }
  }

  /**
   * Structured log for errors with retry logic
   */
  logRetry(
    service: string,
    attempt: number,
    error: Error,
    extra?: Record<string, any>,
  ): void {
    this.logger.warn(
      {
        service,
        attempt,
        errorMessage: error.message,
        errorStack: error.stack,
        ...extra,
      },
      `Retry attempt ${attempt} for ${service}`,
    );
  }
}

import type { TelemetryLogger, WriterSync } from '../.deps.ts';
import { CLITelemetryRenderer } from './CLITelemetryRenderer.ts';

type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'success';

type CliTelemetryLoggerOptions = {
  baseAttributes?: Record<string, unknown>;
  writer?: WriterSync;
};

export function createCliTelemetryLogger(
  options: CliTelemetryLoggerOptions = {},
): TelemetryLogger {
  const baseAttributes = options.baseAttributes ?? {};
  const renderer = new CLITelemetryRenderer(options.writer);

  const log = (
    level: Level,
    message: string,
    attributes?: Record<string, unknown>,
  ) => {
    renderer.render(level, message, { ...baseAttributes, ...attributes });
  };

  const withContext = (
    extra: Record<string, unknown>,
  ): TelemetryLogger => {
    return createCliTelemetryLogger({
      baseAttributes: { ...baseAttributes, ...extra },
      writer: options.writer,
    });
  };

  return {
    debug: (msg, attrs) => log('debug', msg, attrs),
    info: (msg, attrs) => log('info', msg, attrs),
    warn: (msg, attrs) => log('warn', msg, attrs),
    error: (msg, attrs) => log('error', msg, attrs),
    fatal: (msg, attrs) => log('fatal', msg, attrs),
    withContext,
  };
}

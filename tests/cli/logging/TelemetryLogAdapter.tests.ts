import { assertEquals } from '../../test.deps.ts';
import { TelemetryLogAdapter } from '../../../src/cli/logging/TelemetryLogAdapter.ts';

type Call = { level: string; message: string; attributes: Record<string, unknown> | undefined };

function createLogger(calls: Call[]) {
  const logger = {
    info: (msg: string, attrs?: Record<string, unknown>) =>
      calls.push({ level: 'info', message: msg, attributes: attrs }),
    warn: (msg: string, attrs?: Record<string, unknown>) =>
      calls.push({ level: 'warn', message: msg, attributes: attrs }),
    error: (msg: string, attrs?: Record<string, unknown>) =>
      calls.push({ level: 'error', message: msg, attributes: attrs }),
    fatal: () => {},
    withContext: () => logger,
  };

  return logger;
}

Deno.test('TelemetryLogAdapter – routes to telemetry logger with merged attributes', () => {
  const calls: Call[] = [];
  const logger = createLogger(calls);
  const adapter = new TelemetryLogAdapter(logger as any, { cli: 'test' });

  adapter.Info('hello', { ok: true });
  adapter.Warn('warn', 1);
  adapter.Error({ err: 'boom' });
  adapter.Success('done');

  assertEquals(calls[0], {
    level: 'info',
    message: 'hello {"ok":true}',
    attributes: { cli: 'test', levelHint: 'info' },
  });

  assertEquals(calls[1], {
    level: 'warn',
    message: 'warn 1',
    attributes: { cli: 'test', levelHint: 'warn' },
  });

  assertEquals(calls[2], {
    level: 'error',
    message: '{"err":"boom"}',
    attributes: { cli: 'test', levelHint: 'error' },
  });

  assertEquals(calls[3], {
    level: 'info',
    message: 'done',
    attributes: { cli: 'test', levelHint: 'success', success: true },
  });
});

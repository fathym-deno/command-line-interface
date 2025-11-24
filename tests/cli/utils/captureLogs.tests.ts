import { assertEquals } from '../../test.deps.ts';
import { captureLogs } from '../../../src/cli/utils/captureLogs.ts';

Deno.test('captureLogs – captures console output and restores originals', async () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const globalAny = globalThis as { __telemetryWriter?: unknown };

  const output = await captureLogs(async () => {
    console.log('hello');
    console.error('oops');
    console.warn('warned');
    console.info('noted');
  });

  assertEquals(console.log, originalLog);
  assertEquals(console.error, originalError);
  assertEquals(console.warn, originalWarn);
  assertEquals(console.info, originalInfo);
  assertEquals(globalAny.__telemetryWriter, undefined);
  assertEquals(output.trim().split('\n'), ['hello', 'oops', 'warned', 'noted']);
});

Deno.test('captureLogs – useOrig forwards to existing console methods', async () => {
  let forwarded = 0;
  const originalLog = console.log;
  console.log = (..._args: unknown[]) => {
    forwarded++;
  };

  try {
    const output = await captureLogs(async () => {
      console.log('hi');
    }, true);

    assertEquals(output.trim(), 'hi');
    assertEquals(forwarded, 1);
  } finally {
    console.log = originalLog;
  }
});

Deno.test('captureLogs – preserves existing global writer and captures warn/error', async () => {
  const globalAny = globalThis as { __telemetryWriter?: unknown };
  const existingWriter = { writeSync: () => 0 };
  globalAny.__telemetryWriter = existingWriter;

  const output = await captureLogs(async () => {
    console.warn('warn here');
    console.error('error here');
  });

  assertEquals(globalAny.__telemetryWriter, existingWriter);
  assertEquals(output.trim().split('\n'), ['warn here', 'error here']);
});

import { assert, assertEquals } from '../../test.deps.ts';
import { runCommandWithLogs } from '../../../src/cli/utils/runCommandWithLogs.ts';

function createLog() {
  const entries: string[] = [];

  return {
    log: entries,
    logger: {
      Info: (...args: unknown[]) => {
        entries.push(`INFO:${args.join(' ')}`);
      },
      Warn: () => {},
      Error: (...args: unknown[]) => {
        entries.push(`ERR:${args.join(' ')}`);
      },
      Success: () => {},
    },
  };
}

Deno.test('runCommandWithLogs – captures stdout/stderr with prefix', async () => {
  const { log, logger } = createLog();

  const result = await runCommandWithLogs(
    ['eval', "console.log('hi'); console.error('warn');"],
    logger,
    { command: Deno.execPath(), prefix: 'cli: ' },
  );

  assertEquals(result, { code: 0, success: true });
  assert(log.includes('INFO:cli: hi'));
  assert(log.includes('ERR:cli: warn'));
});

Deno.test('runCommandWithLogs – returns failure without exiting when exitOnFail=false', async () => {
  const { log, logger } = createLog();

  const result = await runCommandWithLogs(
    ['eval', "console.error('boom'); Deno.exit(2);"],
    logger,
    { command: Deno.execPath(), exitOnFail: false },
  );

  assertEquals(result.success, false);
  assertEquals(result.code, 2);
  assert(log.some((l) => l.includes('boom')));
});

Deno.test('runCommandWithLogs – calls Deno.exit when command fails', async () => {
  const { log, logger } = createLog();

  const originalExit = Deno.exit;
  let exitCode: number | null = null;
  (Deno as any).exit = (code: number) => {
    exitCode = code;
  };

  try {
    const result = await runCommandWithLogs(
      ['eval', 'Deno.exit(3);'],
      logger,
      { command: Deno.execPath() },
    );

    assertEquals(result.success, false);
    assertEquals(result.code, 3);
  } finally {
    (Deno as any).exit = originalExit;
  }

  assert(exitCode === 3);
  assert(log.some((l) => l.includes('failed with exit code 3')));
});

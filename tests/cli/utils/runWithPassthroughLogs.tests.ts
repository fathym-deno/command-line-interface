import { assert, assertEquals } from '../../test.deps.ts';
import { runWithPassthroughLogs } from '../../../src/cli/utils/runWithPassthroughLogs.ts';

function createLog() {
  const entries: string[] = [];
  const log = {
    Info: (...args: unknown[]) => entries.push(`INFO:${args.join(' ')}`),
    Warn: () => {},
    Error: (...args: unknown[]) => entries.push(`ERR:${args.join(' ')}`),
    Success: () => {},
  };

  return { log, entries };
}

Deno.test('runWithPassthroughLogs – captures stdout/stderr and respects prefix', async () => {
  const { log, entries } = createLog();
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ['eval', "console.log('hi'); console.error('bad');"],
    stdout: 'piped',
    stderr: 'piped',
  });

  const result = await runWithPassthroughLogs(cmd, log, { prefix: 'cli: ' });

  assertEquals(result.success, true);
  assert(entries.some((e) => e === 'INFO:cli: hi'));
  assert(entries.some((e) => e === 'ERR:cli: bad'));
});

Deno.test('runWithPassthroughLogs – exits when command fails by default', async () => {
  const { log, entries } = createLog();
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ['eval', 'Deno.exit(2);'],
    stdout: 'piped',
    stderr: 'piped',
  });

  const originalExit = Deno.exit;
  let exitCode: number | null = null;
  (Deno as any).exit = (code: number) => {
    exitCode = code;
  };

  try {
    const result = await runWithPassthroughLogs(cmd, log);
    assertEquals(result.success, false);
    assertEquals(result.code, 2);
  } finally {
    (Deno as any).exit = originalExit;
  }

  assertEquals(exitCode, 2);
  assert(entries.some((e) => e.includes('exit code 2')));
});

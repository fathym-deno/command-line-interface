import { assert, assertEquals } from '../../test.deps.ts';
import { CommandLogSchema } from '../../../src/cli/commands/CommandLog.ts';

Deno.test('CommandLogSchema – validates logging interface shape', () => {
  const logger = {
    Info: () => {},
    Warn: () => {},
    Error: () => {},
    Success: () => {},
  };

  const parsed = CommandLogSchema.safeParse(logger);
  assert(parsed.success);
});

Deno.test('CommandLogSchema – rejects missing methods', () => {
  const badLogger = { Info: () => {} } as unknown;
  const parsed = CommandLogSchema.safeParse(badLogger);
  assertEquals(parsed.success, false);
});

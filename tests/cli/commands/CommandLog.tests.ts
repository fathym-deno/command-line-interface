import { assert, assertEquals } from '../../test.deps.ts';
import { CommandLogSchema, isCommandLog } from '../../../src/commands/CommandLog.ts';

Deno.test('CommandLog schema and guard', async (t) => {
  await t.step('validates logging interface shape', () => {
    const logger = {
      Info: () => {},
      Warn: () => {},
      Error: () => {},
      Success: () => {},
    };

    const parsed = CommandLogSchema.safeParse(logger);
    assert(parsed.success);
  });

  await t.step('rejects missing methods', () => {
    const badLogger = { Info: () => {} } as unknown;
    const parsed = CommandLogSchema.safeParse(badLogger);
    assertEquals(parsed.success, false);
  });

  await t.step('guard accepts valid and rejects invalid shapes', () => {
    const logger = {
      Info: () => {},
      Warn: () => {},
      Error: () => {},
      Success: () => {},
    };

    assertEquals(isCommandLog(logger), true);
    assertEquals(isCommandLog({ Info: 'nope' }), false);
  });
});

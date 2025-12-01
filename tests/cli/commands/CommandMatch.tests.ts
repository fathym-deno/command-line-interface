import { assertEquals } from '../../test.deps.ts';
import type { CommandMatch } from '../../../src/commands/CommandMatch.ts';

Deno.test('CommandMatch – basic shape defaults', async (t) => {
  await t.step('supports undefined command and empty args/flags', () => {
    const match: CommandMatch = {
      Command: undefined,
      Flags: {},
      Args: [],
      Params: undefined,
    };

    assertEquals(match.Flags, {});
    assertEquals(match.Args, []);
  });
});

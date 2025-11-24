import { assert, assertEquals } from '../../test.deps.ts';
import {
  CommandContextSchema,
  isCommandContext,
} from '../../../src/cli/commands/CommandContext.ts';

const baseContext = {
  Config: { Name: 'Test', Tokens: ['test'], Version: '0.0.0' },
  GroupMetadata: undefined,
  Key: 'hello',
  Log: {
    Info: () => {},
    Warn: () => {},
    Error: () => {},
    Success: () => {},
  },
  Metadata: undefined,
  Services: {},
};

Deno.test('CommandContext schema and guard', async (t) => {
  await t.step('accepts minimal valid context', () => {
    const parsed = CommandContextSchema.safeParse(baseContext);
    assert(parsed.success);
    assertEquals(parsed.data.Key, 'hello');
  });

  await t.step('rejects missing key', () => {
    const { Key, ...rest } = baseContext;
    const parsed = CommandContextSchema.safeParse(rest as unknown);
    assert(!parsed.success);
  });

  await t.step('guard accepts valid and rejects invalid shapes', () => {
    assertEquals(isCommandContext(baseContext), true);
    const { Key, ...rest } = baseContext;
    assertEquals(isCommandContext(rest as unknown), false);
  });
});

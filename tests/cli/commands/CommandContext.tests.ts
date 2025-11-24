import { assert, assertEquals } from '../../test.deps.ts';
import { CommandContextSchema } from '../../../src/cli/commands/CommandContext.ts';

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

Deno.test('CommandContextSchema – accepts minimal valid context', () => {
  const parsed = CommandContextSchema.safeParse(baseContext);
  assert(parsed.success);
  assertEquals(parsed.data.Key, 'hello');
});

Deno.test('CommandContextSchema – rejects missing key', () => {
  const { Key, ...rest } = baseContext;
  const parsed = CommandContextSchema.safeParse(rest as unknown);
  assert(!parsed.success);
});

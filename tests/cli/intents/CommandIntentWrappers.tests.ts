// deno-lint-ignore-file no-explicit-any
import { CommandIntent, CommandIntents } from '../../test.deps.ts';
import { CommandModuleBuilder } from '../../../src/fluent/CommandModuleBuilder.ts';
import { z } from '../../test.deps.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';

class ArgsFlagsParams extends CommandParams<[string], { loud?: boolean }> {}

const builder = new CommandModuleBuilder('wrap', 'wrapped')
  .Args(z.tuple([z.string()]))
  .Flags(z.object({ loud: z.boolean().optional() }))
  .Params(ArgsFlagsParams)
  .Run(() => {});

Deno.test('CommandIntent wrapper accepts CommandModuleBuilder', () => {
  const intentBuilder = CommandIntent(
    'wrapper single',
    builder as any,
    './test-cli/.cli.json',
  );
  // ensure the builder was accepted and exposes expectations API
  intentBuilder.ExpectLogs('noop');
});

Deno.test('CommandIntents wrapper accepts CommandModuleBuilder', () => {
  const intentsBuilder = CommandIntents(
    'wrapper suite',
    builder as any,
    './test-cli/.cli.json',
  );
  intentsBuilder.Intent('noop', (b) => b.ExpectExit(0));
});

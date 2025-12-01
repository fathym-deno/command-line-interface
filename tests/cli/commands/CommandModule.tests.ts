import { assertEquals } from '../../test.deps.ts';
import { CommandModule, defineCommandModule } from '../../../src/commands/CommandModule.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';
import { CommandRuntime } from '../../../src/commands/CommandRuntime.ts';
import { z } from '../../test.deps.ts';

class DemoParams extends CommandParams<[string], { flag?: boolean }> {}

class DemoCommand extends CommandRuntime<DemoParams> {
  public BuildMetadata() {
    return this.buildMetadataFromSchemas(
      'Demo',
      'Demo cmd',
      z.tuple([]),
      z.object({}),
    );
  }

  public Run() {
    return;
  }
}

Deno.test('CommandModule – defineCommandModule shape', async (t) => {
  await t.step('returns expected structure', () => {
    const mod = defineCommandModule({
      ArgsSchema: z.tuple([z.string()]),
      FlagsSchema: z.object({ flag: z.boolean().optional() }),
      Command: DemoCommand,
      Params: DemoParams,
    });

    assertEquals(typeof mod.Command, 'function');
    assertEquals(typeof mod.Params, 'function');
    assertEquals(typeof mod.ArgsSchema, 'object');
    assertEquals(typeof mod.FlagsSchema, 'object');
  });

  await t.step('type shape conforms', () => {
    const mod: CommandModule<[string], { flag?: boolean }, DemoParams> = {
      ArgsSchema: z.tuple([z.string()]),
      FlagsSchema: z.object({ flag: z.boolean().optional() }),
      Command: DemoCommand,
      Params: DemoParams,
    };

    assertEquals(typeof mod.Command, 'function');
  });
});

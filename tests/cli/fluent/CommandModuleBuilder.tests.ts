import { assert, assertEquals, assertThrows, z } from '../../test.deps.ts';
import { CommandModuleBuilder } from '../../../src/cli/fluent/CommandModuleBuilder.ts';
import { CommandParams } from '../../../src/cli/commands/CommandParams.ts';

class DemoParams extends CommandParams<[string], { loud?: boolean }> {
  get Loud() {
    return this.Flag('loud');
  }
}

Deno.test('CommandModuleBuilder – builds module with schemas and run/dryRun', async () => {
  const builder = new CommandModuleBuilder('demo', 'Demo command')
    .Args(z.tuple([z.string()]))
    .Flags(z.object({ loud: z.boolean().optional() }))
    .Params(DemoParams)
    .Run((ctx) => {
      return ctx.Params.Loud ? 2 : 0;
    });

  const mod = builder.Build();
  const runtime = new mod.Command();

  const params = new mod.Params!(['hi'], { loud: true } as any);
  const ctx = {
    Params: params,
    Config: { Name: 'demo', Tokens: ['demo'], Version: '0.0.0' },
    Log: { Info: () => {}, Warn: () => {}, Error: () => {}, Success: () => {} },
    Services: {} as any,
    Commands: {} as any,
  };

  const result = await runtime.Run(ctx as any, {} as any);
  assertEquals(result, 2);

  const md = runtime.BuildMetadata();
  assertEquals(md.Name, 'demo');
  assertEquals(md.Name, 'demo');

  const dryResult = await (runtime as any).DryRun(ctx as any, {} as any);
  assertEquals(dryResult, 2);
});

Deno.test('CommandModuleBuilder – throws when required pieces are missing', () => {
  const builder = new CommandModuleBuilder('oops', 'Missing config');
  assertThrows(() => builder.Build(), Error);
});

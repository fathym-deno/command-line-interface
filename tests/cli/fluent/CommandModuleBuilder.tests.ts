// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertThrows, z } from '../../test.deps.ts';
import { CommandModuleBuilder } from '../../../src/fluent/CommandModuleBuilder.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';

class DemoParams extends CommandParams<[string], { loud?: boolean }> {
  get Loud() {
    return this.Flag('loud');
  }
}

Deno.test(
  'CommandModuleBuilder – builds module with schemas and run/dryRun',
  async () => {
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
      Log: {
        Info: () => {},
        Warn: () => {},
        Error: () => {},
        Success: () => {},
      },
      Services: {} as any,
      Commands: {} as any,
    };

    const result = await runtime.Run(ctx as any, {} as any);
    assertEquals(result, 2);

    const md = runtime.BuildMetadata();
    assertEquals(md.Name, 'demo');
    assertEquals(md.Name, 'demo');

    const dryResult = await runtime.DryRun!(ctx as any, {} as any);
    assertEquals(dryResult, 2);
  },
);

Deno.test(
  'CommandModuleBuilder – throws when required pieces are missing',
  () => {
    const builder = new CommandModuleBuilder('oops', 'Missing config');
    assertThrows(() => builder.Build(), Error);
  },
);

Deno.test(
  'CommandModuleBuilder – accepts subcommands as builder or module',
  () => {
    class EmptyParams extends CommandParams<[], Record<string, unknown>> {}

    const subBuilder = new CommandModuleBuilder('sub', 'Sub command')
      .Args(z.tuple([]))
      .Flags(z.object({}).passthrough())
      .Params(EmptyParams)
      .Run(() => 0);

    const subBuilderTyped = subBuilder as CommandModuleBuilder<
      [],
      Record<string, unknown>,
      EmptyParams
    >;

    const subModule = subBuilder.Build();

    const parentWithBuilder = new CommandModuleBuilder('parent1', 'Parent')
      .Args(z.tuple([]))
      .Flags(z.object({}).passthrough())
      .Params(EmptyParams)
      .Commands({ Sub: subBuilderTyped })
      .Run(() => 0)
      .Build();

    const parentWithModule = new CommandModuleBuilder('parent2', 'Parent')
      .Args(z.tuple([]))
      .Flags(z.object({}).passthrough())
      .Params(EmptyParams)
      .Commands({ Sub: subModule })
      .Run(() => 0)
      .Build();

    // Ensure runtimes can be constructed without throwing.
    new parentWithBuilder.Command();
    new parentWithModule.Command();
  },
);

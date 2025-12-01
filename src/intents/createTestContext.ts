// deno-lint-ignore-file no-explicit-any
import type { CommandContext } from '../commands/CommandContext.ts';
import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandParams } from '../commands/CommandParams.ts';

export function createTestContext<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
>(
  cmd: CommandModule<A, F, P>,
  args: A,
  flags: F,
): Promise<CommandContext<P, Record<string, unknown>, Record<string, any>>> {
  const ctor = cmd.Params!;
  const params = new ctor(args, flags);

  const log = {
    Info: console.log,
    Warn: console.warn,
    Error: console.error,
    Success: (...args: unknown[]) => console.log('✅', ...args),
  };

  return Promise.resolve({
    Key: '',
    ArgsSchema: cmd.ArgsSchema,
    FlagsSchema: cmd.FlagsSchema,
    Params: params,
    Config: {} as any,
    Log: log,
    Services: {} as any,
    Commands: {} as any,
  });
}

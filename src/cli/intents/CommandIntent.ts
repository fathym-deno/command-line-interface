import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import { CommandModuleBuilder } from '../fluent/CommandModuleBuilder.ts';
import { CommandIntentBuilder } from './CommandIntentBuilder.ts';

export function CommandIntent<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
>(
  testName: string,
  command: CommandModule<A, F, P> | CommandModuleBuilder<A, F, P>,
  commandFileUrl: string,
): CommandIntentBuilder<A, F, P> {
  if (command instanceof CommandModuleBuilder) {
    command = command.Build() as unknown as CommandModule<A, F, P>;
  }

  return new CommandIntentBuilder(testName, command, commandFileUrl);
}

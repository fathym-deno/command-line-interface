import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandParams } from '../commands/CommandParams.ts';
import type { CommandInvokerMap } from '../commands/CommandContext.ts';
import { CommandModuleBuilder } from '../fluent/CommandModuleBuilder.ts';
import { CommandIntentBuilder } from './CommandIntentBuilder.ts';

/**
 * Factory function for creating a single command test intent.
 *
 * @typeParam A - Positional arguments tuple type
 * @typeParam F - Flags record type
 * @typeParam P - CommandParams subclass
 * @typeParam S - Services record type for type-safe mocking
 * @typeParam C - CommandInvokerMap for subcommands
 *
 * @param testName - Test description
 * @param command - Command module or fluent builder to test
 * @param commandFileUrl - Path to .cli.json configuration
 * @returns CommandIntentBuilder for configuring the test
 */
export function CommandIntent<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
>(
  testName: string,
  command: CommandModule<A, F, P, S, C> | CommandModuleBuilder<A, F, P, S, C>,
  commandFileUrl: string,
): CommandIntentBuilder<A, F, P, S, C> {
  const mod: CommandModule<A, F, P, S, C> = command instanceof CommandModuleBuilder
    ? command.Build() as CommandModule<A, F, P, S, C>
    : command as CommandModule<A, F, P, S, C>;

  return new CommandIntentBuilder<A, F, P, S, C>(testName, mod, commandFileUrl);
}

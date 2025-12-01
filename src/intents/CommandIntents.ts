// CommandIntents.ts
import type { CommandModule } from "../commands/CommandModule.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import type { CommandInvokerMap } from "../commands/CommandContext.ts";
import { CommandIntentsBuilder } from "./CommandIntentsBuilder.ts";
import { CommandModuleBuilder } from "../fluent/CommandModuleBuilder.ts";

/**
 * Factory function for creating a suite-based command test.
 *
 * This is the **preferred** way to test commands. It provides better organization,
 * shared setup via `.BeforeAll()` and `.WithInit()`, and groups related tests.
 *
 * @typeParam A - Positional arguments tuple type
 * @typeParam F - Flags record type
 * @typeParam P - CommandParams subclass
 * @typeParam S - Services record type for type-safe mocking
 * @typeParam C - CommandInvokerMap for subcommands
 *
 * @param suiteName - Name of the test suite
 * @param command - Command module or fluent builder to test
 * @param cliConfigUrl - Path to .cli.json configuration
 * @returns CommandIntentsBuilder for configuring the test suite
 */
export function CommandIntents<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
>(
  suiteName: string,
  command: CommandModule<A, F, P, S, C> | CommandModuleBuilder<A, F, P, S, C>,
  cliConfigUrl: string,
): CommandIntentsBuilder<A, F, P, S, C> {
  if (command instanceof CommandModuleBuilder) {
    command = command.Build() as CommandModule<A, F, P, S, C>;
  }

  return new CommandIntentsBuilder<A, F, P, S, C>(
    suiteName,
    command,
    cliConfigUrl,
  );
}

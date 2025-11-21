// CommandIntents.ts
import type { CommandModule } from "../commands/CommandModule.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import { CommandIntentsBuilder } from "./CommandIntentsBuilder.ts";
import { CommandModuleBuilder } from "../fluent/CommandModuleBuilder.ts";

export function CommandIntents<
  A extends unknown[],
  F extends Record<string, unknown>,
  P extends CommandParams<A, F>,
>(
  suiteName: string,
  command: CommandModule<A, F, P> | CommandModuleBuilder<A, F, P>,
  cliConfigUrl: string,
): CommandIntentsBuilder<A, F, P> {
  if (command instanceof CommandModuleBuilder) {
    command = command.Build() as CommandModule<A, F, P>;
  }

  return new CommandIntentsBuilder(suiteName, command, cliConfigUrl);
}

import type { CommandParams } from "../commands/CommandParams.ts";
import { CommandModuleBuilder } from "./CommandModuleBuilder.ts";

export function Command<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
>(
  name: string,
  description: string,
): CommandModuleBuilder<A, F, P, Record<string, unknown>> {
  return new CommandModuleBuilder<A, F, P, Record<string, unknown>>(
    name,
    description,
  );
}

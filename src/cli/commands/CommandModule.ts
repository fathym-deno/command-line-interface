import type { ZodSchema } from "../.deps.ts";
import type { CommandRuntime } from "./CommandRuntime.ts";
import type {
  CommandParamConstructor,
  CommandParams,
} from "./CommandParams.ts";

/**
 * Represents a complete, executable CLI command module.
 * Includes runtime class, schemas for validation and docs, and metadata for help.
 */
export type CommandModule<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
> = {
  /**
   * Zod schema defining the expected positional arguments.
   */
  ArgsSchema: ZodSchema<A>;

  /**
   * Zod schema defining the named flags for the command.
   */
  FlagsSchema: ZodSchema<F>;

  /**
   * The executable command class with full param typing.
   */
  Command: new () => CommandRuntime<P>;

  /**
   * Strongly typed parameter constructor class.
   */
  Params?: CommandParamConstructor<A, F, P>;
};

/**
 * Strongly typed helper to define a CLI CommandModule cleanly.
 * Ensures full type inference for flags, args, and param classes.
 */
export function defineCommandModule<
  F extends Record<string, unknown>,
  A extends unknown[],
  P extends CommandParams<A, F>,
  R extends CommandRuntime<P>,
>(def: {
  FlagsSchema: ZodSchema<F>;
  ArgsSchema: ZodSchema<A>;
  Command: new () => R;
  Params: new (args: A, flags: F) => P;
}): CommandModule<A, F, P> {
  return {
    FlagsSchema: def.FlagsSchema,
    ArgsSchema: def.ArgsSchema,
    Command: def.Command,
    Params: def.Params,
  };
}

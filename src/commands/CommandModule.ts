import type { ZodSchema } from '../.deps.ts';
import type { CommandRuntime } from './CommandRuntime.ts';
import type { CommandParamConstructor, CommandParams } from './CommandParams.ts';
import type { CommandInvokerMap } from './CommandContext.ts';

/**
 * Represents a complete, executable CLI command module.
 *
 * Includes runtime class, schemas for validation and docs, and metadata for help.
 * The type parameters preserve full type information through the build pipeline:
 *
 * - `A` - Positional arguments tuple type (from ArgsSchema)
 * - `F` - Flags record type (from FlagsSchema)
 * - `P` - CommandParams subclass for typed parameter access
 * - `S` - Services record type for dependency injection
 * - `C` - CommandInvokerMap for subcommand composition
 *
 * @example
 * ```typescript
 * // Type information flows through Build():
 * const cmd = Command('deploy', 'Deploy application')
 *   .Args(ArgsSchema)
 *   .Flags(FlagsSchema)
 *   .Params(DeployParams)
 *   .Services(async (ctx, ioc) => ({
 *     deployer: await ioc.Resolve<Deployer>(ioc.Symbol('Deployer')),
 *   }))
 *   .Run(...)
 *   .Build();
 *
 * // cmd is typed as CommandModule<Args, Flags, Params, Services, Commands>
 * // enabling type-safe service mocking in tests
 * ```
 */
export type CommandModule<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
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
  Command: new () => CommandRuntime<P, S, C>;

  /**
   * Strongly typed parameter constructor class.
   */
  Params?: CommandParamConstructor<A, F, P>;
};

/**
 * Strongly typed helper to define a CLI CommandModule cleanly.
 * Ensures full type inference for flags, args, param classes, services, and commands.
 */
export function defineCommandModule<
  F extends Record<string, unknown>,
  A extends unknown[],
  P extends CommandParams<A, F>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
  R extends CommandRuntime<P, S, C> = CommandRuntime<P, S, C>,
>(def: {
  FlagsSchema: ZodSchema<F>;
  ArgsSchema: ZodSchema<A>;
  Command: new () => R;
  Params: new (args: A, flags: F) => P;
}): CommandModule<A, F, P, S, C> {
  return {
    FlagsSchema: def.FlagsSchema,
    ArgsSchema: def.ArgsSchema,
    Command: def.Command,
    Params: def.Params,
  };
}

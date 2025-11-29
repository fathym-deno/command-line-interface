// deno-lint-ignore-file no-explicit-any
import type { IoCContainer, ZodSchema } from '../.deps.ts';
import type { CommandParams } from './CommandParams.ts';
import type { CommandContext, CommandInvokerMap } from './CommandContext.ts';
import type { CommandSuggestions } from './CommandSuggestions.ts';
import type { CommandModuleMetadata } from './CommandModuleMetadata.ts';

/**
 * Abstract base class for all CLI commands.
 *
 * CommandRuntime defines the lifecycle contract that all commands must follow.
 * Commands can be created either by extending this class directly or by using
 * the fluent `Command()` builder which generates a CommandRuntime internally.
 *
 * ## Command Lifecycle
 *
 * Commands execute through the following phases:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  1. ConfigureContext()                                      │
 * │     └── injectServices() → Resolve dependencies from IoC    │
 * │     └── injectCommands() → Setup subcommand invokers        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  2. Init() [optional]                                       │
 * │     └── Pre-execution setup, validation, resource init      │
 * ├─────────────────────────────────────────────────────────────┤
 * │  3. Run() or DryRun()                                       │
 * │     └── Main command logic                                  │
 * │     └── DryRun() used when --dry-run flag is present        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  4. Cleanup() [optional]                                    │
 * │     └── Resource cleanup, temp file removal, etc.           │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Features
 * - Type-safe parameter access via generic `P` (params class)
 * - Dependency injection via generic `S` (services record)
 * - Subcommand composition via generic `C` (command invoker map)
 * - Automatic help metadata generation from Zod schemas
 * - DryRun support for safe command testing
 *
 * ## Two Approaches to Creating Commands
 *
 * **Approach 1: Extend CommandRuntime (class-based)**
 * Best for complex commands with multiple lifecycle hooks.
 *
 * **Approach 2: Use Command() builder (fluent API)**
 * Best for simple commands; generates a CommandRuntime internally.
 *
 * @example Class-based command
 * ```typescript
 * import { CommandRuntime, CommandContext, CommandParams } from '@fathym/cli';
 * import { z } from 'zod';
 *
 * const GreetFlagsSchema = z.object({
 *   loud: z.boolean().optional().describe('Shout the greeting'),
 * });
 *
 * class GreetParams extends CommandParams<[], z.infer<typeof GreetFlagsSchema>> {
 *   get Loud(): boolean { return this.Flag('loud') ?? false; }
 * }
 *
 * export class GreetCommand extends CommandRuntime<GreetParams> {
 *   Run(ctx: CommandContext<GreetParams>): void {
 *     const msg = ctx.Params.Loud ? 'HELLO!' : 'Hello!';
 *     ctx.Log.Info(msg);
 *   }
 *
 *   BuildMetadata() {
 *     return this.buildMetadataFromSchemas(
 *       'Greet',
 *       'Print a greeting',
 *       undefined,
 *       GreetFlagsSchema
 *     );
 *   }
 * }
 * ```
 *
 * @example Fluent API command (simpler)
 * ```typescript
 * import { Command } from '@fathym/cli';
 * import { z } from 'zod';
 *
 * export default Command('greet', 'Print a greeting')
 *   .Flags(z.object({ loud: z.boolean().optional() }))
 *   .Run(({ Params, Log }) => {
 *     const msg = Params.Flag('loud') ? 'HELLO!' : 'Hello!';
 *     Log.Info(msg);
 *   });
 * ```
 *
 * @typeParam P - The CommandParams subclass for typed parameter access
 * @typeParam S - Record type for injected services
 * @typeParam C - CommandInvokerMap for subcommand composition
 */
export abstract class CommandRuntime<
  P extends CommandParams<any, any> = CommandParams<any, any>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
> {
  /**
   * Build metadata for help display and command registration.
   *
   * This method is called during command resolution to generate the help text,
   * usage examples, and argument/flag documentation shown to users.
   *
   * @returns Metadata object containing name, description, args, flags, and examples
   */
  public abstract BuildMetadata(): CommandModuleMetadata;

  /**
   * Optional initialization hook called before Run/DryRun.
   *
   * Use this for pre-execution setup such as:
   * - Validating environment prerequisites
   * - Initializing external connections
   * - Loading configuration files
   * - Setting up logging contexts
   *
   * @param ctx - The command execution context
   * @param ioc - IoC container for resolving additional dependencies
   */
  public Init?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | Promise<void>;

  /**
   * Main command execution logic.
   *
   * This is the primary entry point for command behavior. When `--dry-run`
   * is NOT specified, this method is called after Init().
   *
   * @param ctx - The command execution context with params, services, and logging
   * @param ioc - IoC container for resolving additional dependencies
   * @returns Optional exit code (0 = success, non-zero = error)
   */
  public abstract Run(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | number | Promise<void | number>;

  /**
   * Optional dry-run execution logic.
   *
   * When the user passes `--dry-run`, this method is called instead of Run().
   * Use this to show what WOULD happen without actually performing side effects.
   *
   * If not implemented, the command will skip execution when --dry-run is used.
   *
   * @param ctx - The command execution context
   * @param ioc - IoC container for resolving additional dependencies
   * @returns Optional exit code
   */
  public DryRun?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | number | Promise<void | number>;

  /**
   * Optional cleanup hook called after Run/DryRun completes.
   *
   * Use this for resource cleanup such as:
   * - Closing database connections
   * - Removing temporary files
   * - Flushing logs or metrics
   *
   * This method is called even if Run() throws an error.
   *
   * @param ctx - The command execution context
   * @param ioc - IoC container for resolving additional dependencies
   */
  public Cleanup?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | Promise<void>;

  /**
   * Generate command suggestions for shell completion.
   *
   * Override this to provide custom completion suggestions.
   * Default implementation extracts flags and args from Zod schemas.
   *
   * @param ctx - The command execution context
   * @param _ioc - IoC container (unused in default implementation)
   * @returns Suggestions object with Flags and Args arrays
   */
  public Suggestions?(
    ctx: CommandContext<P, S, C>,
    _ioc: IoCContainer,
  ): CommandSuggestions {
    return this.buildSuggestionsFromSchemas(ctx.FlagsSchema, ctx.ArgsSchema);
  }

  /**
   * Configure the command context with services and subcommands.
   *
   * This method is called by the executor before any lifecycle hooks.
   * It invokes `injectServices()` and `injectCommands()` to populate
   * the context with resolved dependencies.
   *
   * @param ctx - The base command context to configure
   * @param ioc - IoC container for dependency resolution
   * @returns The configured context with services and commands populated
   */
  public async ConfigureContext(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): Promise<CommandContext<P, S, C>> {
    if (typeof this.injectServices === 'function') {
      const services = await this.injectServices(ctx, ioc);
      ctx.Services = { ...ctx.Services, ...services };
    }

    if (typeof this.injectCommands === 'function') {
      const commands = await this.injectCommands(ctx, ioc);
      (ctx as any).Commands = commands;
    }

    return ctx;
  }

  /**
   * Override to inject services into the command context.
   *
   * Services are resolved from the IoC container and made available
   * via `ctx.Services` in all lifecycle hooks.
   *
   * @param ctx - The command execution context
   * @param ioc - IoC container for dependency resolution
   * @returns Partial services object to merge into context
   *
   * @example
   * ```typescript
   * protected async injectServices(ctx, ioc) {
   *   return {
   *     db: await ioc.Resolve(DatabaseService),
   *     config: await ioc.Resolve(ConfigService),
   *   };
   * }
   * ```
   */
  protected injectServices?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): Promise<Partial<S>>;

  /**
   * Override to inject subcommand invokers into the command context.
   *
   * Use this when your command has nested subcommands that can be
   * called programmatically via `ctx.Commands`.
   *
   * @param ctx - The command execution context
   * @param ioc - IoC container for dependency resolution
   * @returns Command invoker map for subcommand execution
   */
  protected injectCommands?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): Promise<C>;

  /**
   * Build shell completion suggestions from Zod schemas.
   *
   * Extracts flag names from the flags schema shape and generates
   * placeholder arg names from the args schema tuple.
   *
   * @param flagsSchema - Optional Zod schema for command flags
   * @param argsSchema - Optional Zod tuple schema for positional args
   * @returns Suggestions with Flags and Args arrays
   */
  protected buildSuggestionsFromSchemas(
    flagsSchema?: ZodSchema,
    argsSchema?: ZodSchema,
  ): CommandSuggestions {
    const flags: string[] = [];
    const args: string[] = [];

    if (
      flagsSchema &&
      typeof flagsSchema === 'object' &&
      'shape' in flagsSchema
    ) {
      flags.push(...Object.keys((flagsSchema as any).shape));
    }

    if ((argsSchema as any)?._def?.items) {
      args.push(
        ...(argsSchema as any)._def.items.map(
          (_: unknown, i: number) => `<arg${i + 1}>`,
        ),
      );
    }

    return { Flags: flags, Args: args };
  }

  /**
   * Build command metadata from Zod schemas for help generation.
   *
   * This helper extracts argument and flag information from Zod schemas
   * to generate the metadata used for help display. It supports both
   * Zod 3 and Zod 4 schema formats.
   *
   * @param name - Display name for the command
   * @param description - Brief description of what the command does
   * @param argsSchema - Zod tuple schema defining positional arguments
   * @param flagsSchema - Zod object schema defining command flags
   * @returns Complete metadata for help display
   *
   * @example
   * ```typescript
   * BuildMetadata() {
   *   return this.buildMetadataFromSchemas(
   *     'Deploy',
   *     'Deploy the application to production',
   *     z.tuple([z.string().describe('Environment')]),
   *     z.object({ force: z.boolean().optional() })
   *   );
   * }
   * ```
   */
  protected buildMetadataFromSchemas(
    name: string,
    description?: string,
    argsSchema?: ZodSchema,
    flagsSchema?: ZodSchema,
  ): CommandModuleMetadata {
    const usageParts: string[] = [];
    const argsMeta: CommandModuleMetadata['Args'] = [];
    const flagsMeta: CommandModuleMetadata['Flags'] = [];

    if ((argsSchema as any)?._def?.items?.length) {
      (argsSchema as any)._def.items.forEach((item: any, i: number) => {
        // Zod 4: meta is accessed via .meta() method, fallback to _def.meta for older versions
        const meta = typeof item.meta === 'function' ? item.meta() : item._def?.meta;
        const argName = meta?.argName ?? `arg${i + 1}`;
        const optional = typeof item.isOptional === 'function'
          ? item.isOptional()
          : item._def?.typeName === 'ZodOptional' || item._def?.type === 'optional';
        // Zod 4: description is a direct property, fallback to _def for older versions
        const itemDescription = item.description ?? item._def?.description;
        argsMeta.push({
          Name: argName,
          Description: itemDescription,
          Optional: optional,
        });
      });

      usageParts.push(...argsMeta.map((a) => `<${a.Name}>`));
    }

    if (
      flagsSchema &&
      typeof flagsSchema === 'object' &&
      'shape' in flagsSchema
    ) {
      Object.entries((flagsSchema as any).shape).forEach(([flagKey, schema]) => {
        // Zod 4: meta is accessed via .meta() method, fallback to _def.meta for older versions
        const meta = typeof (schema as any).meta === 'function'
          ? (schema as any).meta()
          : (schema as any)._def?.meta;
        const displayName = meta?.flagName ?? flagKey;
        const optional = typeof (schema as any).isOptional === 'function'
          ? (schema as any).isOptional()
          : (schema as any)._def?.typeName === 'ZodOptional' ||
            (schema as any)._def?.type === 'optional';
        // Zod 4: description is a direct property, fallback to _def for older versions
        const flagDescription = (schema as any).description ??
          (schema as any)._def?.description;
        flagsMeta.push({
          Name: displayName,
          Description: flagDescription,
          Optional: optional,
        });
      });

      usageParts.push(...flagsMeta.map((f) => `[--${f.Name}]`));
    }

    const usage = usageParts.join(' ');
    const examples = usage ? [usage] : [];

    return {
      Name: name,
      Description: description,
      Usage: usage,
      Examples: examples,
      Args: argsMeta.length ? argsMeta : undefined,
      Flags: flagsMeta.length ? flagsMeta : undefined,
    };
  }
}

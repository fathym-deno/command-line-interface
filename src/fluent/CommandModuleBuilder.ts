// deno-lint-ignore-file no-explicit-any ban-types
import type { ZodSchema } from '../.deps.ts';
import type { IoCContainer } from '../.deps.ts';

import type { CommandModule } from '../commands/CommandModule.ts';
import type { CommandContext } from '../commands/CommandContext.ts';
import type { CommandParamConstructor, CommandParams } from '../commands/CommandParams.ts';

import { CommandRuntime } from '../commands/CommandRuntime.ts';
import { CLICommandExecutor } from '../executor/CLICommandExecutor.ts';
import type { CommandInvokerMap } from '../commands/CommandContext.ts';
import { CLICommandResolver } from '../CLICommandResolver.ts';

type UsedKeys = Record<string, true>;

type RemoveUsed<T, Used extends UsedKeys> = Omit<T, keyof Used>;

export type ExtractInvokerMap<T extends Record<string, CommandModule>> = {
  [K in keyof T]: CommandInvokerMap[string];
};

/**
 * Union type for what .Commands() accepts - either a built CommandModule
 * or a CommandModuleBuilder that will be built lazily at execution time.
 */
export type CommandSource<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
> =
  | CommandModule<A, F, any>
  | CommandModuleBuilder<A, F, any, any, any, any>
  | { Build: () => CommandModule<A, F, any, any, any> };

/**
 * Extract invoker function types from either CommandModule or CommandModuleBuilder.
 * This enables type-safe command invocation regardless of whether the user
 * passes a built module or a builder.
 */
export type ExtractInvokerMapFromSource<
  T extends Record<string, CommandSource>,
> = {
  [K in keyof T]: CommandInvokerMap[string];
};

export class CommandModuleBuilder<
  TArgs extends unknown[] = unknown[],
  TFlags extends Record<string, unknown> = Record<string, unknown>,
  TParams extends CommandParams<TArgs, TFlags> = CommandParams<TArgs, TFlags>,
  TServices extends Record<string, unknown> = Record<string, unknown>,
  TCommands extends CommandInvokerMap = CommandInvokerMap,
  TUsed extends UsedKeys = {},
> {
  protected argsSchema?: ZodSchema<TArgs>;
  protected flagsSchema?: ZodSchema<TFlags>;
  protected runFn?: (
    ctx: CommandContext<TParams, TServices, TCommands>,
  ) => void | number | Promise<void | number>;
  protected initFn?: (
    ctx: CommandContext<TParams, TServices, TCommands>,
  ) => void | Promise<void>;
  protected cleanupFn?: (
    ctx: CommandContext<TParams, TServices, TCommands>,
  ) => void | Promise<void>;
  protected dryRunFn?: (
    ctx: CommandContext<TParams, TServices, TCommands>,
  ) => void | number | Promise<void | number>;
  protected servicesFactory?: (
    ctx: CommandContext<TParams, TServices, TCommands>,
    ioc: IoCContainer,
  ) => Promise<TServices>;
  protected subcommands?: Record<string, CommandSource>;
  protected paramsCtor?: CommandParamConstructor<TArgs, TFlags, TParams>;

  constructor(
    protected readonly name: string,
    protected readonly description: string,
  ) {}

  public Args<NextArgs extends unknown[]>(
    schema: ZodSchema<NextArgs>,
  ): RemoveUsed<
    CommandModuleBuilder<
      NextArgs,
      TFlags,
      CommandParams<NextArgs, TFlags>,
      TServices,
      TCommands,
      TUsed & { Args: true }
    >,
    TUsed & { Args: true }
  > {
    this.argsSchema = schema as unknown as ZodSchema<TArgs>;
    return this as any;
  }

  public Flags<NextFlags extends Record<string, unknown>>(
    schema: ZodSchema<NextFlags>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      NextFlags,
      CommandParams<TArgs, NextFlags>,
      TServices,
      TCommands,
      TUsed & { Flags: true }
    >,
    TUsed & { Flags: true }
  > {
    this.flagsSchema = schema as unknown as ZodSchema<TFlags>;
    return this as any;
  }

  public Params<NextParams extends CommandParams<TArgs, TFlags>>(
    ctor: CommandParamConstructor<TArgs, TFlags, NextParams>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      NextParams,
      TServices,
      TCommands,
      TUsed & { Params: true }
    >,
    TUsed & { Params: true }
  > {
    this.paramsCtor = ctor as unknown as CommandParamConstructor<
      TArgs,
      TFlags,
      TParams
    >;
    return this as any;
  }

  public Services<NextServices extends Record<string, unknown>>(
    factory: (
      ctx: CommandContext<TParams, TServices, TCommands>,
      ioc: IoCContainer,
    ) => Promise<NextServices>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      NextServices,
      TCommands,
      TUsed & { Services: true }
    >,
    TUsed & { Services: true }
  > {
    this.servicesFactory = factory as any;
    return this as any;
  }

  public Init(
    fn: (
      ctx: CommandContext<TParams, TServices, TCommands>,
    ) => void | Promise<void>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      TServices,
      TCommands,
      TUsed & { Init: true }
    >,
    TUsed & { Init: true }
  > {
    this.initFn = fn;
    return this as any;
  }

  public Cleanup(
    fn: (
      ctx: CommandContext<TParams, TServices, TCommands>,
    ) => void | Promise<void>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      TServices,
      TCommands,
      TUsed & { Cleanup: true }
    >,
    TUsed & { Cleanup: true }
  > {
    this.cleanupFn = fn;
    return this as any;
  }

  public DryRun(
    fn: (
      ctx: CommandContext<TParams, TServices, TCommands>,
    ) => void | number | Promise<void | number>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      TServices,
      TCommands,
      TUsed & { DryRun: true }
    >,
    TUsed & { DryRun: true }
  > {
    this.dryRunFn = fn;
    return this as any;
  }

  public Run(
    fn: (
      ctx: CommandContext<TParams, TServices, TCommands>,
    ) => void | number | Promise<void | number>,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      TServices,
      TCommands,
      TUsed & { Run: true }
    >,
    TUsed & { Run: true }
  > {
    this.runFn = fn;
    return this as any;
  }

  public Commands<
    TSubcommands extends Record<string, CommandSource<any, any>>,
  >(
    commands: TSubcommands,
  ): RemoveUsed<
    CommandModuleBuilder<
      TArgs,
      TFlags,
      TParams,
      TServices,
      ExtractInvokerMapFromSource<TSubcommands>,
      TUsed & { Commands: true }
    >,
    TUsed & { Commands: true }
  > {
    this.subcommands = commands;
    return this as any;
  }

  public Build(): CommandModule<TArgs, TFlags, TParams, TServices, TCommands> {
    const {
      name,
      description,
      argsSchema,
      flagsSchema,
      runFn,
      initFn,
      cleanupFn,
      dryRunFn,
      servicesFactory,
      subcommands,
      paramsCtor,
    } = this;

    if (!argsSchema || !flagsSchema || !runFn || !paramsCtor) {
      throw new Error(
        'CommandModuleBuilder is missing required Args, Flags, Params, or Run configuration.',
      );
    }

    class BuiltCommand extends CommandRuntime<TParams, TServices, TCommands> {
      override async Init(
        ctx: CommandContext<TParams, TServices, TCommands>,
        _ioc: IoCContainer,
      ) {
        if (initFn) await initFn(ctx);
      }

      override async Run(
        ctx: CommandContext<TParams, TServices, TCommands>,
        _ioc: IoCContainer,
      ) {
        return await runFn!(ctx);
      }

      override async Cleanup(
        ctx: CommandContext<TParams, TServices, TCommands>,
        _ioc: IoCContainer,
      ) {
        if (cleanupFn) await cleanupFn(ctx);
      }

      override async DryRun(
        ctx: CommandContext<TParams, TServices, TCommands>,
        ioc: IoCContainer,
      ) {
        if (dryRunFn) {
          return await dryRunFn(ctx);
        } else {
          return await this.Run(ctx, ioc);
        }
      }

      protected override async injectServices(
        ctx: CommandContext<TParams, TServices, TCommands>,
        ioc: IoCContainer,
      ): Promise<Partial<TServices>> {
        return servicesFactory ? await servicesFactory(ctx, ioc) : {};
      }

      protected override injectCommands(
        ctx: CommandContext<TParams, TServices, TCommands>,
        ioc: IoCContainer,
      ): Promise<TCommands> {
        if (!subcommands) return Promise.resolve({} as TCommands);

        const invokers: CommandInvokerMap = {};

        for (const [key, source] of Object.entries(subcommands)) {
          // Check if it's a builder or already a module - build lazily if needed
          const mod = source instanceof CommandModuleBuilder
            ? source.Build() // It's a builder, call Build() now
            : (source as CommandModule); // It's already a module

          const runtime = new mod.Command();
          const ctor = mod.Params;

          invokers[key] = async (
            args?: string[],
            flags?: Record<string, unknown>,
          ) => {
            const executor = new CLICommandExecutor(
              ioc,
              await ioc.Resolve(CLICommandResolver),
            );

            await executor.Execute(ctx.Config, runtime, {
              key,
              flags: flags ?? {},
              positional: args ?? [],
              paramsCtor: ctor,
              baseTemplatesDir: undefined,
            });
          };
        }

        return Promise.resolve(invokers as TCommands);
      }

      override BuildMetadata() {
        return this.buildMetadataFromSchemas(
          name,
          description,
          argsSchema,
          flagsSchema,
        );
      }
    }

    return {
      ArgsSchema: argsSchema,
      FlagsSchema: flagsSchema,
      Command: BuiltCommand,
      Params: paramsCtor,
    };
  }
}

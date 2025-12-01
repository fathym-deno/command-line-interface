// deno-lint-ignore-file no-explicit-any
import type { CLIConfig } from '../types/CLIConfig.ts';
import type { IoCContainer, TelemetryLogger, WriterSync, ZodSchema } from '../.deps.ts';

import type { CommandRuntime } from '../commands/CommandRuntime.ts';
import type { CommandContext, CommandInvokerMap } from '../commands/CommandContext.ts';
import { type CommandParamConstructor, CommandParams } from '../commands/CommandParams.ts';

import { HelpCommand } from '../help/HelpCommand.ts';
import type { CLICommandResolver } from '../CLICommandResolver.ts';
import { CLIDFSContextManager } from '../CLIDFSContextManager.ts';
import { TelemetryLogAdapter } from '../logging/TelemetryLogAdapter.ts';
import { createCliTelemetryLogger } from '../logging/createCliTelemetryLogger.ts';
import { ValidationPipeline } from '../validation/ValidationPipeline.ts';
import type { ValidateCallback } from '../validation/types.ts';

type TelemetryWriterGlobal = { __telemetryWriter?: WriterSync };

/**
 * Options provided when executing a CLI command.
 * These are derived during the parsing + resolution phase.
 */
export interface CLICommandExecutorOptions {
  /** Fully resolved command key (e.g. 'init', 'schema/promote') */
  key: string;

  /** Parsed named flags (e.g., --config ./foo.json) */
  flags: Record<string, unknown>;

  /** Parsed positional arguments (e.g., ['run', 'foo']) */
  positional: string[];

  /** The command’s param constructor (from `.Params(...)`) */
  paramsCtor: CommandParamConstructor<any, any, any> | undefined;

  /** Optional template base directory */
  baseTemplatesDir: string | undefined;

  /**
   * Optional subcommand invokers — if this command was defined with `.Commands(...)`,
   * this is the map of callable `(flags, args?) => Promise<void>` handlers.
   */
  commands?: CommandInvokerMap;

  /** Optional Zod schema for positional arguments */
  argsSchema?: ZodSchema;

  /** Optional Zod schema for flags */
  flagsSchema?: ZodSchema;

  /** Optional custom validation callback */
  validate?: ValidateCallback;
}

/**
 * CLICommandExecutor is the runtime orchestrator that prepares
 * and runs a single command — handling logging, params, services,
 * and lifecycle phases (Init, Run, DryRun, Cleanup).
 */
export class CLICommandExecutor {
  constructor(
    protected readonly ioc: IoCContainer,
    protected resolver: CLICommandResolver,
  ) {}

  /**
   * Execute a resolved command instance with the given options.
   * Responsible for logging, context preparation, and error handling.
   */
  public async Execute(
    config: CLIConfig,
    command: CommandRuntime | undefined,
    options: CLICommandExecutorOptions,
  ): Promise<void> {
    if (!command) return;

    const isHelp = command instanceof HelpCommand;
    const context = await this.buildContext(config, command, options);

    try {
      if (!isHelp) {
        context.Log.Info(`🚀 ${config.Name}: running "${options.key}"`);
      }

      const result = await this.runLifecycle(command, context);

      if (typeof result === 'number') {
        Deno.exit(result);
      }

      if (!isHelp) {
        context.Log.Success(`${config.Name}: "${options.key}" completed`);
      }
    } catch (err) {
      context.Log.Error(`💥 Error during "${options.key}" execution:\n`, err);
      Deno.exit(1);
    }
  }

  /**
   * Constructs a fully populated CommandContext, including CLI metadata,
   * logging, parameter class, resolved commands map (if present), and hydrated services.
   *
   * Also runs validation pipeline if schemas are provided.
   */
  protected async buildContext(
    config: CLIConfig,
    command: CommandRuntime,
    opts: CLICommandExecutorOptions,
  ): Promise<CommandContext> {
    const { flags, positional, paramsCtor, argsSchema, flagsSchema, validate } = opts;

    // Create telemetry/log early so validation can use it
    const telemetry = await this.ensureTelemetryLogger(config);
    const log = new TelemetryLogAdapter(telemetry, {
      commandKey: opts.key,
    });

    // Run validation pipeline if schemas are provided
    let resolvedArgs: unknown[] = positional;
    let resolvedFlags: Record<string, unknown> = flags;

    if (argsSchema || flagsSchema) {
      const pipeline = new ValidationPipeline();

      // Create preliminary params for the validate callback
      const prelimParams = paramsCtor
        ? new paramsCtor(positional, flags)
        : new (class extends CommandParams<unknown[], Record<string, unknown>> {
          constructor() {
            super(positional, flags);
          }
        })();

      const validationResult = await pipeline.execute(
        positional,
        flags,
        prelimParams,
        {
          argsSchema,
          flagsSchema,
          validateCallback: validate,
          log,
        },
      );

      if (!validationResult.success) {
        const errorMsg = pipeline.formatErrors(validationResult);
        log.Error(errorMsg);
        throw new Error(errorMsg);
      }

      // Use resolved/validated values
      if (validationResult.data) {
        resolvedArgs = validationResult.data.args;
        resolvedFlags = validationResult.data.flags;
      }
    }

    // Create params with resolved values
    const params = paramsCtor
      ? new paramsCtor(resolvedArgs, resolvedFlags)
      : new (class extends CommandParams<unknown[], Record<string, unknown>> {
        constructor() {
          super(resolvedArgs as string[], resolvedFlags);
        }
      })();

    const dfsCtxMgr = await this.ioc.Resolve(CLIDFSContextManager);

    const tempLocator = await this.resolver.ResolveTemplateLocator(
      await dfsCtxMgr.GetProjectDFS(),
    );

    if (tempLocator) {
      this.ioc.Register(() => tempLocator, {
        Type: this.ioc.Symbol('TemplateLocator'),
      });
    }

    const baseContext: CommandContext = {
      ArgsSchema: argsSchema,
      FlagsSchema: flagsSchema,
      Config: config,
      GroupMetadata: undefined,
      Key: opts.key,
      Log: log,
      Metadata: command.BuildMetadata(),
      Params: params,
      Services: {},
      Commands: opts.commands ?? undefined,
    };

    return await command.ConfigureContext(baseContext, this.ioc);
  }

  /**
   * Ensure a TelemetryLogger is available in IoC. If none has been registered
   * (e.g., tests calling the executor directly), create the CLI logger and
   * register it on the fly so downstream resolution succeeds.
   */
  protected async ensureTelemetryLogger(config: CLIConfig): Promise<TelemetryLogger> {
    const telemetrySymbol = this.ioc.Symbol('TelemetryLogger');

    try {
      return await this.ioc.Resolve<TelemetryLogger>(telemetrySymbol);
    } catch {
      // fall through to create a CLI-scoped logger
    }

    let writer: WriterSync | undefined;
    try {
      writer = await this.ioc.Resolve(this.ioc.Symbol('TelemetryWriter'));
    } catch {
      writer = (globalThis as TelemetryWriterGlobal).__telemetryWriter;
    }

    const logger = createCliTelemetryLogger({
      baseAttributes: {
        cliName: config.Name,
        cliVersion: config.Version,
      },
      writer,
    });

    this.ioc.Register(() => logger, { Type: telemetrySymbol });

    return logger;
  }

  /**
   * Executes the full command lifecycle in the following order:
   * 1. Init (if present)
   * 2. Run or DryRun (based on `--dry-run`)
   * 3. Cleanup (if present)
   *
   * Expects already hydrated context (via `buildContext()`).
   */
  protected async runLifecycle(
    cmd: CommandRuntime,
    ctx: CommandContext,
  ): Promise<number | void> {
    if (typeof cmd.Init === 'function') {
      await cmd.Init(ctx, this.ioc);
    }

    const result = typeof cmd.DryRun === 'function' && ctx.Params.DryRun
      ? await cmd.DryRun(ctx, this.ioc)
      : await cmd.Run(ctx, this.ioc);

    if (typeof cmd.Cleanup === 'function') {
      await cmd.Cleanup(ctx, this.ioc);
    }

    return result;
  }
}

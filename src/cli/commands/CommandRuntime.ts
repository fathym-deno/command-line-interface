// deno-lint-ignore-file no-explicit-any
import type { IoCContainer, ZodSchema } from '../.deps.ts';
import type { CommandParams } from './CommandParams.ts';
import type { CommandContext, CommandInvokerMap } from './CommandContext.ts';
import type { CommandSuggestions } from './CommandSuggestions.ts';
import type { CommandModuleMetadata } from './CommandModuleMetadata.ts';

/**
 * Abstract base class for all CLI commands.
 * Supports both fluent-built and class-authored modules via a shared lifecycle contract.
 */
export abstract class CommandRuntime<
  P extends CommandParams<any, any> = CommandParams<any, any>,
  S extends Record<string, unknown> = Record<string, unknown>,
  C extends CommandInvokerMap = CommandInvokerMap,
> {
  public abstract BuildMetadata(): CommandModuleMetadata;

  public Init?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | Promise<void>;

  public abstract Run(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | number | Promise<void | number>;

  public DryRun?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | number | Promise<void | number>;

  public Cleanup?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): void | Promise<void>;

  public Suggestions?(
    ctx: CommandContext<P, S, C>,
    _ioc: IoCContainer,
  ): CommandSuggestions {
    return this.buildSuggestionsFromSchemas(ctx.FlagsSchema, ctx.ArgsSchema);
  }

  /**
   * Inject services and commands into the command context before lifecycle hooks.
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

  protected injectServices?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): Promise<Partial<S>>;

  protected injectCommands?(
    ctx: CommandContext<P, S, C>,
    ioc: IoCContainer,
  ): Promise<C>;

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

  protected buildMetadataFromSchemas(
    name: string,
    description?: string,
    argsSchema?: ZodSchema,
    flagsSchema?: ZodSchema,
  ): CommandModuleMetadata {
    const usageParts: string[] = [];

    if ((argsSchema as any)?._def?.items?.length) {
      usageParts.push(
        ...(argsSchema as any)._def.items.map(
          (_: unknown, i: number) => `<arg${i + 1}>`,
        ),
      );
    }

    if (
      flagsSchema &&
      typeof flagsSchema === 'object' &&
      'shape' in flagsSchema
    ) {
      usageParts.push(
        ...Object.keys((flagsSchema as any).shape).map((f) => `[--${f}]`),
      );
    }

    const usage = usageParts.join(' ');
    const examples = usage ? [usage] : [];

    return {
      Name: name,
      Description: description,
      Usage: usage,
      Examples: examples,
    };
  }
}

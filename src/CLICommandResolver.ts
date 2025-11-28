// deno-lint-ignore-file no-explicit-any
import type { DFSFileHandler, ZodSchema } from './.deps.ts';
import type { CLIFileSystemHooks } from './CLIFileSystemHooks.ts';
import { CommandModuleMetadata } from './commands/CommandModuleMetadata.ts';
import { CommandParamConstructor, CommandParams } from './commands/CommandParams.ts';
import { CommandRuntime } from './commands/CommandRuntime.ts';
import type { TemplateLocator } from './templates/TemplateLocator.ts';
import { CLICommandEntry } from './types/CLICommandEntry.ts';
import { CLIConfig, CLICommandSource } from './types/CLIConfig.ts';
import { CLIInitFn } from './types/CLIInitFn.ts';

export class CLICommandResolver {
  constructor(protected readonly hooks: CLIFileSystemHooks) {}

  public ResolveCommandMap(
    source: CLICommandSource,
  ): Promise<Map<string, CLICommandEntry>> {
    return this.hooks.ResolveCommandEntryPaths(source);
  }

  public async LoadCommandInstance(path: string): Promise<{
    Command: CommandRuntime<CommandParams<any, any>, Record<string, unknown>>;
    Params?: CommandParamConstructor<any, any, any> | undefined;
    ArgsSchema?: ZodSchema;
    FlagsSchema?: ZodSchema;
  }> {
    const mod = await this.hooks.LoadCommandModule(path);
    const Cmd = mod?.Command;

    if (Cmd && typeof Cmd === 'function') {
      return {
        Command: new Cmd(),
        Params: mod.Params,
        ArgsSchema: mod.ArgsSchema,
        FlagsSchema: mod.FlagsSchema,
      };
    }

    return {
      Command: new (class extends CommandRuntime {
        public Run() {
          throw new Error(
            'This is a metadata-only command and cannot be executed.',
          );
        }

        public override BuildMetadata(): CommandModuleMetadata {
          const m = mod as unknown as CommandModuleMetadata;
          return this.buildMetadataFromSchemas(m.Name, m.Description);
        }
      })(),
    };
  }

  public ResolveConfig(args: string[]): Promise<{
    config: CLIConfig;
    resolvedPath: string;
    remainingArgs: string[];
  }> {
    return this.hooks.ResolveConfig(args);
  }

  public ResolveInitFn(
    path: string,
  ): Promise<{ initFn: CLIInitFn | undefined; resolvedInitPath: string }> {
    return this.hooks.LoadInitFn(path);
  }

  public ResolveTemplateLocator(
    dfsHandler?: DFSFileHandler,
  ): Promise<TemplateLocator | undefined> {
    return this.hooks.ResolveTemplateLocator(dfsHandler);
  }
}

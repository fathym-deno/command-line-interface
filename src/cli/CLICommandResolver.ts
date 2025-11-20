// deno-lint-ignore-file no-explicit-any
import type { DFSFileHandler, ZodSchema } from "./.deps.ts";
import type { CLIFileSystemHooks } from "./CLIFileSystemHooks.ts";
import { type CLICommandEntry, type CLIConfig, type CLIInitFn, type CommandModuleMetadata, type CommandParamConstructor, type CommandParams, CommandRuntime } from "./.exports.ts";
import type { TemplateLocator } from "./templates/TemplateLocator.ts";

export class CLICommandResolver {
  constructor(protected readonly hooks: CLIFileSystemHooks) {}

  public ResolveCommandMap(dir: string): Promise<Map<string, CLICommandEntry>> {
    return this.hooks.ResolveCommandEntryPaths(dir);
  }

  public async LoadCommandInstance(path: string): Promise<{
    Command: CommandRuntime<CommandParams<any, any>, Record<string, unknown>>;
    Params?: CommandParamConstructor<any, any, any> | undefined;
    ArgsSchema?: ZodSchema;
    FlagsSchema?: ZodSchema;
  }> {
    const mod = await this.hooks.LoadCommandModule(path);
    const Cmd = mod?.Command;

    if (Cmd && typeof Cmd === "function") {
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
            "This is a metadata-only command and cannot be executed.",
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

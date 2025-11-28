import { IoCContainer, type TelemetryLogger, type WriterSync } from './.deps.ts';
import { CLICommandExecutor } from './executor/CLICommandExecutor.ts';
import type { CLIConfig, CLICommandSource } from './types/CLIConfig.ts';
import type { CLIOptions } from './types/CLIOptions.ts';
import { LocalDevCLIFileSystemHooks } from './hooks/LocalDevCLIFileSystemHooks.ts';
import { CLICommandInvocationParser } from './parser/CLICommandInvocationParser.ts';
import { CLICommandResolver } from './CLICommandResolver.ts';
import type { CLICommandEntry } from './types/CLICommandEntry.ts';
import { CLICommandMatcher } from './matcher/CLICommandMatcher.ts';
import { CLIDFSContextManager } from './CLIDFSContextManager.ts';
import { CLICommandRegistry } from './CLICommandRegistry.ts';

type TelemetryWriterGlobal = { __telemetryWriter?: WriterSync };

export class CLI {
  protected dfsCtxMgr: CLIDFSContextManager;
  protected resolver: CLICommandResolver;
  protected parser: CLICommandInvocationParser;
  protected registry: CLICommandRegistry;

  constructor(
    options: CLIOptions = {},
    protected ioc: IoCContainer = new IoCContainer(),
  ) {
    this.dfsCtxMgr = options.dfsCtxMgr ?? new CLIDFSContextManager(this.ioc);
    this.parser = options.parser ??
      new CLICommandInvocationParser(this.dfsCtxMgr);
    this.resolver = options.resolver ??
      new CLICommandResolver(new LocalDevCLIFileSystemHooks(this.dfsCtxMgr));
    this.registry = new CLICommandRegistry();

    this.ioc.Register(CLICommandResolver, () => this.resolver);
    this.ioc.Register(CLICommandInvocationParser, () => this.parser);
    this.ioc.Register(CLIDFSContextManager, () => this.dfsCtxMgr);
    this.ioc.Register(CLICommandRegistry, () => this.registry);
  }

  async RunFromArgs(args: string[]): Promise<void> {
    const { config, resolvedPath, remainingArgs } = await this.resolver
      .ResolveConfig(args);

    return await this.RunWithConfig(config, remainingArgs, resolvedPath);
  }

  public async RunWithConfig(
    config: CLIConfig,
    args: string[],
    configPath: string,
  ): Promise<void> {
    await this.registerTelemetry(config);

    const parsed = await this.parser.ParseInvocation(config, args, configPath);

    await this.initialize(parsed.initPath, parsed.config);

    // Resolve commands from all configured sources
    const commandMap = await this.resolveAllCommandSources(
      parsed.commandSources,
    );

    const mergedCommandMap = this.mergeCommandMaps(commandMap);

    const matcher = new CLICommandMatcher(this.resolver);
    const { Command, Flags, Args, Params } = await matcher.Resolve(
      parsed.config,
      mergedCommandMap,
      parsed.key,
      parsed.flags,
      parsed.positional,
    );

    const executor = new CLICommandExecutor(this.ioc, this.resolver);

    await executor.Execute(parsed.config, Command, {
      key: parsed.key || '',
      flags: Flags,
      positional: Args,
      paramsCtor: Params,
      baseTemplatesDir: parsed.baseTemplatesDir,
    });
  }

  /**
   * Resolves command entries from all configured command sources.
   * Throws an error if duplicate command keys are detected across sources.
   */
  protected async resolveAllCommandSources(
    sources: CLICommandSource[],
  ): Promise<Map<string, CLICommandEntry>> {
    const mergedMap = new Map<string, CLICommandEntry>();
    const sourceMap = new Map<string, string>(); // Track which source each key came from

    for (const source of sources) {
      const sourceCommands = await this.resolver.ResolveCommandMap(source);

      for (const [key, entry] of sourceCommands.entries()) {
        if (mergedMap.has(key)) {
          const existingSource = sourceMap.get(key);
          throw new Error(
            `Duplicate command key '${key}' detected.\n` +
              `  - First defined in: ${existingSource}\n` +
              `  - Also defined in: ${source.Path}${source.Root ? ` (root: ${source.Root})` : ''}\n` +
              `\nPlease ensure each command key is unique across all command sources.`,
          );
        }

        mergedMap.set(key, entry);
        sourceMap.set(
          key,
          `${source.Path}${source.Root ? ` (root: ${source.Root})` : ''}`,
        );
      }
    }

    return mergedMap;
  }

  protected async initialize(initPath: string | undefined, config: CLIConfig) {
    this.dfsCtxMgr.RegisterExecutionDFS();

    if (initPath) {
      const { initFn, resolvedInitPath } = await this.resolver.ResolveInitFn(
        initPath,
      );

      this.dfsCtxMgr.RegisterProjectDFS(resolvedInitPath);

      await initFn?.(this.ioc, config);
    }
  }

  protected async registerTelemetry(config: CLIConfig) {
    // Install a CLI-local telemetry logger that renders to stderr with styling.
    const { createCliTelemetryLogger } = await import('./logging/createCliTelemetryLogger.ts');

    let writer: WriterSync | undefined = undefined;
    try {
      writer = await this.ioc.Resolve(this.ioc.Symbol('TelemetryWriter'));
    } catch {
      // optional writer not provided; fall back to global test writer or stderr
      const globalWriter = (globalThis as TelemetryWriterGlobal)
        .__telemetryWriter;
      if (globalWriter) writer = globalWriter;
    }

    const logger: TelemetryLogger = createCliTelemetryLogger({
      baseAttributes: {
        cliName: config.Name,
        cliVersion: config.Version,
      },
      writer,
    });

    this.ioc.Register(() => logger, {
      Type: this.ioc.Symbol('TelemetryLogger'),
    });
  }

  protected mergeCommandMaps(
    filesystemCommands: Map<string, CLICommandEntry>,
  ): Map<string, CLICommandEntry> {
    const merged = new Map<string, CLICommandEntry>(filesystemCommands);

    const inMemoryCommands = this.registry.GetCommands();

    for (const [key, entry] of inMemoryCommands.entries()) {
      if (merged.has(key)) {
        console.warn(
          `CLICommandRegistry: Duplicate command key '${key}' detected. Using in-memory command over filesystem command.`,
        );
      }

      merged.set(key, entry);
    }

    return merged;
  }
}

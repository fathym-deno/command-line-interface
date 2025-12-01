import { IoCContainer, type TelemetryLogger, type WriterSync } from './.deps.ts';
import { CLICommandExecutor } from './executor/CLICommandExecutor.ts';
import type { CLICommandSource, CLIConfig } from './types/CLIConfig.ts';
import type { CLIOptions } from './types/CLIOptions.ts';
import { LocalDevCLIFileSystemHooks } from './hooks/LocalDevCLIFileSystemHooks.ts';
import { CLICommandInvocationParser } from './parser/CLICommandInvocationParser.ts';
import { CLICommandResolver } from './CLICommandResolver.ts';
import type { CLICommandEntry } from './types/CLICommandEntry.ts';
import { CLICommandMatcher } from './matcher/CLICommandMatcher.ts';
import { CLIDFSContextManager } from './CLIDFSContextManager.ts';
import { CLICommandRegistry } from './CLICommandRegistry.ts';

type TelemetryWriterGlobal = { __telemetryWriter?: WriterSync };

/**
 * Main CLI runtime orchestrator.
 *
 * The CLI class coordinates all aspects of command-line application execution:
 * configuration loading, command resolution, argument parsing, and command
 * execution. It serves as the primary entry point for CLI applications.
 *
 * ## Execution Flow
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  1. RunFromArgs(args)                                               │
 * │     └── ResolveConfig() → Load .cli.json                            │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  2. RunWithConfig(config, args, path)                               │
 * │     ├── registerTelemetry() → Setup logging                         │
 * │     ├── ParseInvocation() → Extract command key, flags, args        │
 * │     ├── initialize() → Run init function, register DFS contexts     │
 * │     ├── resolveAllCommandSources() → Load command modules           │
 * │     └── CLICommandMatcher.Resolve() → Find matching command         │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  3. CLICommandExecutor.Execute()                                    │
 * │     └── Run the matched command through its lifecycle               │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Features
 * - Automatic `.cli.json` configuration discovery
 * - Multiple command source support (filesystem, in-memory)
 * - Duplicate command detection with detailed error messages
 * - IoC container integration for dependency injection
 * - Telemetry and structured logging
 * - DFS context management for file operations
 *
 * @example Basic CLI setup
 * ```typescript
 * import { CLI } from '@fathym/cli';
 *
 * const cli = new CLI();
 * await cli.RunFromArgs(Deno.args);
 * ```
 *
 * @example CLI with custom resolver (for compiled/embedded CLIs)
 * ```typescript
 * import { CLI, CLICommandResolver } from '@fathym/cli';
 * import { EmbeddedCLIFileSystemHooks } from './EmbeddedCLIFileSystemHooks.ts';
 *
 * const cli = new CLI({
 *   resolver: new CLICommandResolver(new EmbeddedCLIFileSystemHooks()),
 * });
 *
 * await cli.RunFromArgs(Deno.args);
 * ```
 *
 * @example CLI with programmatic commands
 * ```typescript
 * import { CLI, CLICommandRegistry, Command } from '@fathym/cli';
 *
 * const cli = new CLI();
 * const registry = await cli.ioc.Resolve(CLICommandRegistry);
 *
 * registry.Register('greet', Command('Greet', 'Say hello')
 *   .Run(({ Log }) => Log.Info('Hello!'))
 * );
 *
 * await cli.RunFromArgs(Deno.args);
 * ```
 */
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

  /**
   * Run the CLI from raw command-line arguments.
   *
   * This is the primary entry point for CLI applications. It resolves
   * the configuration file, parses arguments, and executes the matched command.
   *
   * @param args - Command-line arguments (typically `Deno.args`)
   *
   * @example
   * ```typescript
   * const cli = new CLI();
   * await cli.RunFromArgs(Deno.args);
   * ```
   */
  async RunFromArgs(args: string[]): Promise<void> {
    const { config, resolvedPath, remainingArgs } = await this.resolver
      .ResolveConfig(args);

    return await this.RunWithConfig(config, remainingArgs, resolvedPath);
  }

  /**
   * Run the CLI with a pre-loaded configuration.
   *
   * Use this when you already have the configuration object, such as
   * in compiled CLIs or testing scenarios.
   *
   * @param config - The CLI configuration object
   * @param args - Remaining command-line arguments after config resolution
   * @param configPath - Absolute path to the configuration file
   */
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
              `  - Also defined in: ${source.Path}${
                source.Root ? ` (root: ${source.Root})` : ''
              }\n` +
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

    // Register ConfigDFS if ConfigDFSName is set
    if (config.ConfigDFSName) {
      await this.dfsCtxMgr.RegisterConfigDFS({
        name: config.ConfigDFSName,
        token: config.Tokens[0],
        root: config.ConfigDFSRoot,
        rootEnvVar: config.ConfigDFSRootEnvVar,
      });
    }

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

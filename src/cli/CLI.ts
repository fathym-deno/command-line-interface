import { IoCContainer } from "./.deps.ts";
import type { CLIConfig } from "./types/CLIConfig.ts";
import type { CLIOptions } from "./types/CLIOptions.ts";

import { CLICommandInvocationParser } from "./CLICommandInvocationParser.ts";
import { CLICommandResolver } from "./CLICommandResolver.ts";
import { CLICommandExecutor } from "./CLICommandExecutor.ts";
import type { CLICommandEntry } from "./types/CLICommandEntry.ts";
import { CLICommandMatcher } from "./CLICommandMatcher.ts";
import { CLIDFSContextManager } from "./CLIDFSContextManager.ts";
import { CLICommandRegistry } from "./CLICommandRegistry.ts";
import { LocalDevCLIFileSystemHooks } from "./LocalDevCLIFileSystemHooks.ts";

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
    const parsed = await this.parser.ParseInvocation(config, args, configPath);

    await this.initialize(parsed.initPath, parsed.config);

    const commandMap = await this.resolver.ResolveCommandMap(
      parsed.baseCommandDir,
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
      key: parsed.key || "",
      flags: Flags,
      positional: Args,
      paramsCtor: Params,
      baseTemplatesDir: parsed.baseTemplatesDir,
    });
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

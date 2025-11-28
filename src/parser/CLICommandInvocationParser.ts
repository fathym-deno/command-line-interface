import { parseArgs } from '../.deps.ts';
import type { CLIParsedResult } from '../types/CLIParsedResult.ts';
import type { CLIConfig } from '../types/CLIConfig.ts';
import type { CLIDFSContextManager } from '../CLIDFSContextManager.ts';
import { normalizeCommandSources } from '../utils/normalizeCommandSources.ts';

export class CLICommandInvocationParser {
  constructor(protected readonly dfs: CLIDFSContextManager) {}

  public async ParseInvocation(
    config: CLIConfig,
    args: string[],
    configPath: string,
  ): Promise<CLIParsedResult> {
    // Ensure the ProjectDFS is registered using the provided config path
    this.dfs.RegisterProjectDFS(configPath);

    const parsed = parseArgs(args, { boolean: true });
    const { _, ...flags } = parsed;
    const positional = _.map(String);
    const key = positional.filter((p) => !p.startsWith('-')).join('/');

    // Normalize command sources from config
    const commandSources = normalizeCommandSources(config.Commands);

    const baseTemplatesDir = await this.dfs.ResolvePath(
      'project',
      config.Templates ?? './templates',
    );

    // Check if .cli.init.ts exists within the project DFS
    const initCandidate = '.cli.init.ts';
    const projectDfs = await this.dfs.GetProjectDFS();

    let initFileInfo = await projectDfs.GetFileInfo(initCandidate);
    if (!initFileInfo) {
      // Some DFS handlers expect relative paths to include './'
      initFileInfo = await projectDfs.GetFileInfo(`./${initCandidate}`);
    }

    if (!initFileInfo) {
      const allPaths = await projectDfs.LoadAllPaths();
      const found = allPaths.find((p) => p.replace(/^\.\/?/, '') === initCandidate);
      if (found) {
        initFileInfo = { Contents: new ReadableStream(), Path: found };
      }
    }

    const initPath = initFileInfo
      ? await this.dfs.ResolvePath('project', initCandidate)
      : undefined;

    return {
      parsed,
      flags,
      positional,
      key,
      config,
      commandSources,
      baseTemplatesDir,
      initPath,
    };
  }
}

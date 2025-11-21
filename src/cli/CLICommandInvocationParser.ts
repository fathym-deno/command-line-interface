import { parseArgs } from "./.deps.ts";
import type { CLIParsedResult } from "./types/CLIParsedResult.ts";
import type { CLIConfig } from "./types/CLIConfig.ts";
import type { CLIDFSContextManager } from "./CLIDFSContextManager.ts";

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
    const key = positional.filter((p) => !p.startsWith("-")).join("/");

    // Use DFS resolution rather than path join
    const baseCommandDir = await this.dfs.ResolvePath(
      "project",
      config.Commands ?? "./commands",
    );

    const baseTemplatesDir = await this.dfs.ResolvePath(
      "project",
      config.Templates ?? "./templates",
    );

    // Check if .cli.init.ts exists within the project DFS
    const initCandidate = ".cli.init.ts";
    const initFileInfo = await (
      await this.dfs.GetProjectDFS()
    ).GetFileInfo(initCandidate);

    const initPath = initFileInfo
      ? await this.dfs.ResolvePath("project", initCandidate)
      : undefined;

    return {
      parsed,
      flags,
      positional,
      key,
      config,
      baseCommandDir,
      baseTemplatesDir,
      initPath,
    };
  }
}

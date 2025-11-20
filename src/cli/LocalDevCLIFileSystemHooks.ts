import { type DFSFileHandler, exists, join, resolve, toFileUrl } from "./.deps.ts";
import type { CLICommandEntry } from "./types/CLICommandEntry.ts";
import type { CLIConfig } from "./types/CLIConfig.ts";
import type { CommandModule } from "./commands/CommandModule.ts";
import { CommandModuleBuilder } from "./fluent/CommandModuleBuilder.ts";
import type { TemplateLocator } from "./templates/TemplateLocator.ts";
import type { CLIFileSystemHooks } from "./CLIFileSystemHooks.ts";
import type { CLIInitFn } from "./types/CLIInitFn.ts";
import type { CLIDFSContextManager } from "./CLIDFSContextManager.ts";
import { DFSTemplateLocator } from "./templates/DFSTemplateLocator.ts";

export class LocalDevCLIFileSystemHooks implements CLIFileSystemHooks {
  constructor(protected dfsCtxMgr: CLIDFSContextManager) {}

  public async ResolveCommandEntryPaths(
    baseDir: string,
  ): Promise<Map<string, CLICommandEntry>> {
    const map = new Map<string, CLICommandEntry>();

    const dfs = await this.dfsCtxMgr.GetProjectDFS();

    // Normalize baseDir relative to DFS root
    const projectRoot = dfs.Root.replace(/\\/g, "/").replace(/^\.\/|\/$/, "");
    const cleanBaseDir = baseDir
      .replace(/\\/g, "/")
      .replace(projectRoot, "")
      .replace(/^\.?\//, "")
      .replace(/^\/+/, "");

    const filePaths = await dfs.LoadAllPaths();

    const tsFiles = filePaths
      .map((f) => f.replace(/^\.?\//, ""))
      .filter((f) => f.startsWith(cleanBaseDir) && f.endsWith(".ts"));

    for (const path of tsFiles) {
      const rel = path
        .replace(cleanBaseDir + "/", "")
        .replace(/\\/g, "/")
        .replace(/\/index$/, "");

      const key = path.endsWith("/.metadata.ts") ? rel.replace(/\/\.metadata\.ts$/, "") : rel.replace(/\.ts$/, "");

      const group = key.split("/")[0];

      const entryData = map.get(key) || {
        CommandPath: undefined,
        GroupPath: undefined,
        ParentGroup: group !== key ? group : undefined,
      };

      const resolvedPath = await this.dfsCtxMgr.ResolvePath("project", path);

      if (path.endsWith(".metadata.ts")) {
        entryData.GroupPath = resolvedPath;
      } else {
        entryData.CommandPath = resolvedPath;
      }

      map.set(key, entryData);
    }

    return map;
  }

  public async ResolveConfig(args: string[]): Promise<{
    config: CLIConfig;
    resolvedPath: string;
    remainingArgs: string[];
  }> {
    let configPath: string | undefined;
    let remainingArgs = args;

    if (args[0]?.endsWith(".json") && (await exists(args[0]))) {
      configPath = args[0];
      remainingArgs = args.slice(1);
    } else {
      const fallback = join(Deno.cwd(), ".cli.json");
      if (await exists(fallback)) {
        configPath = fallback;
      } else {
        console.error(
          `❌ Unable to locate CLI config.\n` +
            `🧐 Tried: first arg and fallback '.cli.json'\n` +
            `👉 Create one or pass path explicitly.\n`,
        );
        Deno.exit(1);
      }
    }

    const resolvedPath = resolve(configPath!);
    const configText = await Deno.readTextFile(resolvedPath);
    const config = JSON.parse(configText) as CLIConfig;

    return { config, resolvedPath, remainingArgs };
  }

  public async LoadCommandModule(path: string): Promise<CommandModule> {
    let mod = (await import(toFileUrl(path).href)).default;
    if (mod instanceof CommandModuleBuilder) mod = mod.Build();
    return mod as CommandModule;
  }

  public async LoadInitFn(
    initPath: string,
  ): Promise<{ initFn: CLIInitFn | undefined; resolvedInitPath: string }> {
    const resolvedInitPath = toFileUrl(initPath).href;

    const mod = (await import(resolvedInitPath)).default;

    return { initFn: mod as CLIInitFn, resolvedInitPath };
  }

  public ResolveTemplateLocator(
    dfsHandler?: DFSFileHandler,
  ): Promise<TemplateLocator | undefined> {
    return Promise.resolve(
      dfsHandler ? new DFSTemplateLocator(dfsHandler) : undefined,
    );
  }
}

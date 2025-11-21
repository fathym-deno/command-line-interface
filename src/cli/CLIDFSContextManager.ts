import {
  type DFSFileHandler,
  dirname,
  existsSync,
  fromFileUrl,
  type IoCContainer,
  join,
  LocalDFSFileHandler,
  type LocalDFSFileHandlerDetails,
} from "./.deps.ts";

export class CLIDFSContextManager {
  constructor(protected ioc: IoCContainer) {}

  // ─── DFS Registration Methods ─────────────────────────────────────────

  public RegisterCustomDFS(
    name: string,
    details: LocalDFSFileHandlerDetails,
  ): string {
    this.ioc.Register(
      LocalDFSFileHandler,
      () => new LocalDFSFileHandler(details),
      {
        Name: name,
      },
    );

    return details.FileRoot;
  }

  public RegisterExecutionDFS(cwd: string = Deno.cwd()): string {
    return this.RegisterCustomDFS("execution", { FileRoot: cwd });
  }

  public RegisterProjectDFS(
    fileUrlInProject: string,
    name: string = "project",
    rootFile: string = ".cli.json",
  ): string {
    if (fileUrlInProject.startsWith("file:///")) {
      fileUrlInProject = fromFileUrl(fileUrlInProject);
    }

    const localPath = dirname(fileUrlInProject);
    const projectRoot = this.findProjectRoot(localPath, rootFile);

    return this.RegisterCustomDFS(name, { FileRoot: projectRoot });
  }

  public RegisterUserHomeDFS(): string {
    const homeDir = this.getUserHomeDir();
    return this.RegisterCustomDFS("user-home", { FileRoot: homeDir });
  }

  // ─── DFS Access Utilities ─────────────────────────────────────────────
  public async GetUserHomeDFS(): Promise<DFSFileHandler> {
    try {
      return await this.GetDFS("user-home");
    } catch {
      this.RegisterUserHomeDFS();
      return await this.GetDFS("user-home");
    }
  }

  public async GetDFS(name: string): Promise<DFSFileHandler> {
    const dfs = await this.ioc.Resolve(LocalDFSFileHandler, name);

    if (!dfs) {
      throw new Error(`DFS "${name}" not registered.`);
    }

    return dfs;
  }

  public async GetExecutionDFS(): Promise<DFSFileHandler> {
    return await this.GetDFS("execution");
  }

  public async GetProjectDFS(): Promise<DFSFileHandler> {
    return await this.GetDFS("project");
  }

  public async ResolvePath(scope: string, ...parts: string[]): Promise<string> {
    const dfs = await this.GetDFS(scope);

    return dfs.ResolvePath(...parts);
  }

  // ─── Internal Root Discovery ──────────────────────────────────────────

  protected findProjectRoot(startDir: string, rootFile: string): string {
    let current = startDir;
    while (true) {
      const candidate = join(current, rootFile);
      if (existsSync(candidate)) return current;

      const parent = dirname(current);
      if (parent === current) {
        throw new Error(`No ${rootFile} found walking up from: ${startDir}`);
      }
      current = parent;
    }
  }

  protected getUserHomeDir(): string {
    const env = Deno.env.get(
      Deno.build.os === "windows" ? "USERPROFILE" : "HOME",
    );
    if (!env) throw new Error("❌ Unable to determine user home directory.");
    return env;
  }
}

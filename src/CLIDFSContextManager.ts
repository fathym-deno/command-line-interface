import {
  type DFSFileHandler,
  dirname,
  ensureDir,
  existsSync,
  fromFileUrl,
  type IoCContainer,
  join,
  LocalDFSFileHandler,
  type LocalDFSFileHandlerDetails,
} from "./.deps.ts";

/**
 * Options for registering a ConfigDFS handler.
 */
export interface ConfigDFSOptions {
  /**
   * Folder name for the config directory (e.g., ".ftm", ".spire").
   */
  name: string;

  /**
   * First CLI token, used to derive the default env var name.
   * For token "ftm", the default env var is "FTM_CONFIG_ROOT".
   */
  token: string;

  /**
   * Explicit root directory override from config.
   * Takes precedence over default env var but not custom env var.
   */
  root?: string;

  /**
   * Custom environment variable name for root override.
   * - Non-empty string: checks that env var for root
   * - Empty string "": disables ALL env var checking
   * - undefined: checks default env var {TOKEN}_CONFIG_ROOT
   */
  rootEnvVar?: string;
}

/**
 * Coordinates multiple DFS handlers for different filesystem scopes.
 *
 * The CLIDFSContextManager manages named DFS instances for common CLI contexts:
 * - **execution**: Current working directory where the CLI was invoked
 * - **project**: Project root (walks up to find `.cli.json`)
 * - **user-home**: User's home directory for global configuration
 * - **custom**: Any additional named DFS handlers
 *
 * @example Standard CLI setup
 * ```typescript
 * const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
 * dfsCtx.RegisterExecutionDFS();
 * dfsCtx.RegisterProjectDFS(import.meta.url);
 *
 * const projectDfs = await dfsCtx.GetProjectDFS();
 * const config = await projectDfs.GetFileInfo('.cli.json');
 * ```
 *
 * @example Config override pattern (from build command)
 * ```typescript
 * if (ctx.Params.ConfigOverride) {
 *   dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, 'CLI');
 * }
 *
 * const buildDFS = ctx.Params.ConfigOverride
 *   ? await dfsCtx.GetDFS('CLI')
 *   : await dfsCtx.GetExecutionDFS();
 * ```
 *
 * @see {@link LocalDFSFileHandler} - Underlying file handler
 */
export class CLIDFSContextManager {
  /**
   * Creates a new DFS context manager.
   *
   * @param ioc - IoC container for DFS registration
   */
  constructor(protected ioc: IoCContainer) {}

  // ─── DFS Registration Methods ─────────────────────────────────────────

  /**
   * Register a custom DFS handler with any name.
   *
   * @param name - Unique DFS registration name
   * @param details - Local DFS handler configuration
   * @returns The registered file root path
   *
   * @example
   * ```typescript
   * dfsCtx.RegisterCustomDFS('temp', { FileRoot: '/tmp/mycli' });
   * dfsCtx.RegisterCustomDFS('output', { FileRoot: './dist' });
   * ```
   */
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

  /**
   * Register a DFS handler for the current execution directory.
   *
   * @param cwd - Working directory path (defaults to Deno.cwd())
   * @returns The registered file root path
   *
   * @example
   * ```typescript
   * dfsCtx.RegisterExecutionDFS();  // Uses current directory
   * dfsCtx.RegisterExecutionDFS('/custom/path');  // Custom path
   * ```
   */
  public RegisterExecutionDFS(cwd: string = Deno.cwd()): string {
    return this.RegisterCustomDFS("execution", { FileRoot: cwd });
  }

  /**
   * Register a DFS handler for the project root.
   *
   * Walks up the directory tree from the given file URL to find the project
   * root (directory containing the root file, typically `.cli.json`).
   *
   * @param fileUrlInProject - File URL or path within the project
   * @param name - DFS registration name (defaults to 'project')
   * @param rootFile - File that marks project root (defaults to '.cli.json')
   * @returns The registered project root path
   * @throws Error if no root file is found walking up the directory tree
   *
   * @example
   * ```typescript
   * // Standard project DFS
   * dfsCtx.RegisterProjectDFS(import.meta.url);
   *
   * // Named DFS for config override
   * dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, 'CLI');
   * ```
   */
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

  /**
   * Register a DFS handler for the user's home directory.
   *
   * @returns The user home directory path
   * @throws Error if unable to determine home directory
   *
   * @example
   * ```typescript
   * dfsCtx.RegisterUserHomeDFS();
   * // Windows: C:\Users\username
   * // Unix: /home/username
   * ```
   */
  public RegisterUserHomeDFS(): string {
    const homeDir = this.getUserHomeDir();
    return this.RegisterCustomDFS("user-home", { FileRoot: homeDir });
  }

  // ─── DFS Access Utilities ─────────────────────────────────────────────

  /**
   * Get the user home DFS handler.
   *
   * Auto-registers the user home DFS if not already registered.
   *
   * @returns The user home DFS handler
   *
   * @example
   * ```typescript
   * const homeDfs = await dfsCtx.GetUserHomeDFS();
   * const configPath = await homeDfs.ResolvePath('.mycli/config.json');
   * ```
   */
  public async GetUserHomeDFS(): Promise<DFSFileHandler> {
    try {
      return await this.GetDFS("user-home");
    } catch {
      this.RegisterUserHomeDFS();
      return await this.GetDFS("user-home");
    }
  }

  // ─── ConfigDFS Methods ─────────────────────────────────────────────────

  /**
   * Register a DFS handler for the CLI configuration directory.
   *
   * Root resolution precedence:
   * 1. Custom env var (if rootEnvVar is set and non-empty)
   * 2. Explicit root (if root is set)
   * 3. Default env var {TOKEN}_CONFIG_ROOT (if rootEnvVar is undefined)
   * 4. User home directory
   *
   * @param options - Configuration options for ConfigDFS
   * @returns The absolute config directory path
   * @throws Error if unable to determine home directory
   *
   * @example Default behavior (checks FTM_CONFIG_ROOT, falls back to user home)
   * ```typescript
   * await dfsCtx.RegisterConfigDFS({ name: '.ftm', token: 'ftm' });
   * ```
   *
   * @example With explicit root
   * ```typescript
   * await dfsCtx.RegisterConfigDFS({ name: '.ftm', token: 'ftm', root: '/data' });
   * // Resolves to /data/.ftm
   * ```
   *
   * @example Disable env var checking
   * ```typescript
   * await dfsCtx.RegisterConfigDFS({ name: '.ftm', token: 'ftm', rootEnvVar: '' });
   * // Always uses user home, ignores FTM_CONFIG_ROOT
   * ```
   */
  public async RegisterConfigDFS(options: ConfigDFSOptions): Promise<string> {
    const root = this.resolveConfigRoot(options);
    const configPath = join(root, options.name);

    // Ensure config directory exists (cross-platform)
    await ensureDir(configPath);

    return this.RegisterCustomDFS("config", { FileRoot: configPath });
  }

  /**
   * Resolve the root directory for ConfigDFS based on precedence rules.
   *
   * @param options - Configuration options
   * @returns The resolved root directory path
   */
  protected resolveConfigRoot(options: ConfigDFSOptions): string {
    const { token, root, rootEnvVar } = options;

    // 1. Custom env var (if explicitly set and non-empty)
    if (rootEnvVar !== undefined && rootEnvVar !== "") {
      const envValue = Deno.env.get(rootEnvVar);
      if (envValue) return envValue;
    }

    // 2. Explicit root from config
    if (root) return root;

    // 3. Default env var (only if rootEnvVar is undefined, not empty string)
    if (rootEnvVar === undefined) {
      const defaultEnvVar = `${token.toUpperCase()}_CONFIG_ROOT`;
      const envValue = Deno.env.get(defaultEnvVar);
      if (envValue) return envValue;
    }

    // 4. Fall back to user home
    return this.getUserHomeDir();
  }

  /**
   * Get the config DFS handler.
   *
   * @returns The config DFS handler
   * @throws Error if config DFS was not registered
   *
   * @example
   * ```typescript
   * const configDfs = await dfsCtx.GetConfigDFS();
   * const settings = await configDfs.GetFileInfo('settings.json');
   * ```
   */
  public async GetConfigDFS(): Promise<DFSFileHandler> {
    return await this.GetDFS("config");
  }

  /**
   * Get a registered DFS handler by name.
   *
   * @param name - DFS registration name
   * @returns The DFS handler
   * @throws Error if DFS is not registered
   *
   * @example
   * ```typescript
   * const dfs = await dfsCtx.GetDFS('project');
   * const files = await dfs.LoadAllPaths();
   * ```
   */
  public async GetDFS(name: string): Promise<DFSFileHandler> {
    const dfs = await this.ioc.Resolve(LocalDFSFileHandler, name);

    if (!dfs) {
      throw new Error(`DFS "${name}" not registered.`);
    }

    return dfs;
  }

  /**
   * Get the execution directory DFS handler.
   *
   * @returns The execution DFS handler
   *
   * @example
   * ```typescript
   * const execDfs = await dfsCtx.GetExecutionDFS();
   * const cwd = await execDfs.ResolvePath('.');
   * ```
   */
  public async GetExecutionDFS(): Promise<DFSFileHandler> {
    return await this.GetDFS("execution");
  }

  /**
   * Get the project root DFS handler.
   *
   * @returns The project DFS handler
   *
   * @example
   * ```typescript
   * const projectDfs = await dfsCtx.GetProjectDFS();
   * const config = await projectDfs.GetFileInfo('.cli.json');
   * ```
   */
  public async GetProjectDFS(): Promise<DFSFileHandler> {
    return await this.GetDFS("project");
  }

  /**
   * Resolve a path within a named DFS scope.
   *
   * @param scope - DFS scope name
   * @param parts - Path segments to join
   * @returns Resolved absolute path
   *
   * @example
   * ```typescript
   * const templatesPath = await dfsCtx.ResolvePath('project', './templates');
   * const outputPath = await dfsCtx.ResolvePath('execution', 'dist', 'bundle.js');
   * ```
   */
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

import { resolve, z } from '../.deps.ts';
import type { DFSFileHandler } from '../.deps.ts';

/**
 * Represents a single command source configuration.
 * Allows specifying a path to commands and an optional root prefix for command keys.
 */
export type CLICommandSource = {
  /**
   * Relative path to the commands directory.
   * May be relative to the CLI config file location.
   */
  Path: string;

  /**
   * Optional prefix for command keys derived from this source.
   * Can be nested using forward slashes (e.g., "plugins/v2").
   * When specified, all command keys from this source will be prefixed with this value.
   */
  Root?: string;
};

/**
 * Represents the structure of the root CLI configuration (`.cli.json`).
 * This governs the CLI's identity, entry tokens, command structure, and versioning.
 */
export type CLIConfig = {
  /**
   * A user-facing, friendly name for the CLI.
   * Shown in help output, logs, and documentation headers.
   */
  Name: string;

  /**
   * All valid CLI tokens (aliases) that can invoke this CLI.
   * Typically includes the bin name or short aliases like `oi`, `thinky`, etc.
   */
  Tokens: string[];

  /**
   * The version of the CLI, shown in `--help` and logs.
   */
  Version: string;

  /**
   * Optional description of the CLI shown in the intro section of help.
   */
  Description?: string;

  /**
   * Root folder(s) containing CLI commands and group definitions.
   * Can be:
   * - A single path string (e.g., "./commands")
   * - An array of path strings (e.g., ["./commands", "./plugins"])
   * - An array of CLICommandSource objects with optional Root prefixes
   * Defaults to `./commands` when undefined.
   */
  Commands?: string | string[] | CLICommandSource[];

  /**
   * Root folder containing CLI templates.
   * May be absolute or relative. Defaults to `./template`.
   */
  Templates?: string;

  /**
   * Folder name for the configuration directory (e.g., ".ftm", ".spire").
   * Required for ConfigDFS to be set up. The full path is determined by
   * combining this with the resolved root directory.
   *
   * @example ".ftm" resolves to "~/.ftm/" by default
   */
  ConfigDFSName?: string;

  /**
   * Explicit root directory for ConfigDFS. When set, this path is used
   * as the base directory (after env var check).
   *
   * @example "/data" with ConfigDFSName ".ftm" resolves to "/data/.ftm"
   */
  ConfigDFSRoot?: string;

  /**
   * Custom environment variable name to check for root override.
   * - If set to a non-empty string: checks that env var for root
   * - If set to empty string "": disables ALL env var checking
   * - If not set (undefined): checks default env var {TOKEN}_CONFIG_ROOT
   *
   * @example "SPIRE_DATA_DIR" checks that env var for root override
   * @example "" disables all env var checking
   */
  ConfigDFSRootEnvVar?: string;
};

/**
 * Zod schema for validating a CLICommandSource object.
 */
export const CLICommandSourceSchema: z.ZodObject<
  { Path: z.ZodString; Root: z.ZodOptional<z.ZodString> },
  z.core.$strip
> = z.object({
  Path: z.string().min(1, 'Command source path is required.'),
  Root: z.string().optional(),
});

/**
 * Zod schema for validating a CLIConfig object.
 * Used for parsing `.cli.json`, generating usage help,
 * and resolving the CLI's token, name, and version.
 */
export const CLIConfigSchema: z.ZodType<CLIConfig> = z.object({
  Name: z
    .string()
    .min(1, 'CLI name is required.')
    .describe('A user-facing, friendly name for the CLI.'),

  Tokens: z
    .array(z.string())
    .min(1, 'At least one CLI token is required.')
    .describe('CLI aliases, e.g. ["openindustrial", "oi"]'),

  Version: z
    .string()
    .min(1, 'CLI version is required.')
    .describe('Version shown in help output and CLI logs.'),

  Description: z
    .string()
    .optional()
    .describe('Optional description of what this CLI is for.'),

  Commands: z
    .union([z.string(), z.array(z.string()), z.array(CLICommandSourceSchema)])
    .optional()
    .describe(
      "Path(s) to CLI command folder(s). Can be a string, array of strings, or array of CLICommandSource objects. Defaults to './commands'.",
    ),

  ConfigDFSName: z
    .string()
    .optional()
    .describe('Folder name for config directory (e.g., ".ftm")'),

  ConfigDFSRoot: z
    .string()
    .optional()
    .describe('Explicit root directory for ConfigDFS'),

  ConfigDFSRootEnvVar: z
    .string()
    .optional()
    .describe('Custom env var name for root override, or "" to disable env var checking'),
});

/**
 * Inferred runtime type from CLIConfigSchema.
 * Matches the validated structure used throughout the CLI engine.
 */
export type CLIConfigSchema = z.infer<typeof CLIConfigSchema>;

/**
 * Runtime type guard for CLIConfig.
 */
export function isCLIConfig(value: unknown): value is CLIConfig {
  return CLIConfigSchema.safeParse(value).success;
}

/**
 * Options for loading a CLI configuration file.
 */
export interface LoadCLIConfigOptions {
  /**
   * Optional DFS file handler for resolving the config path.
   * When provided, the path will be resolved through the DFS before reading.
   */
  dfs?: DFSFileHandler;

  /**
   * The directory to resolve relative paths against.
   * Defaults to Deno.cwd() if not specified.
   */
  baseDir?: string;
}

/**
 * Loads and parses a CLI configuration file with full type safety.
 *
 * This generic function allows consuming CLIs to extend the base CLIConfig
 * with their own custom properties while maintaining type safety.
 *
 * @template T - The config type, must extend CLIConfig. Defaults to CLIConfig.
 * @param configPath - Path to the .cli.json configuration file
 * @param options - Optional configuration for path resolution
 * @returns The parsed and validated configuration object
 * @throws Error if the file cannot be read or required fields are missing
 *
 * @example Basic usage (returns CLIConfig)
 * ```typescript
 * const config = await loadCLIConfig('./.cli.json');
 * console.log(config.Name); // Typed as string
 * ```
 *
 * @example Extended config with custom properties
 * ```typescript
 * interface MyConfig extends CLIConfig {
 *   Release?: {
 *     Targets?: string[];
 *   };
 * }
 *
 * const config = await loadCLIConfig<MyConfig>('./.cli.json');
 * console.log(config.Release?.Targets); // Typed correctly
 * ```
 */
export async function loadCLIConfig<T extends CLIConfig = CLIConfig>(
  configPath: string,
  options?: LoadCLIConfigOptions,
): Promise<T> {
  const { dfs, baseDir } = options ?? {};

  // Resolve the config path
  const resolvedPath = dfs
    ? await dfs.ResolvePath(configPath)
    : resolve(baseDir ?? Deno.cwd(), configPath);

  // Read and parse the config file
  const content = await Deno.readTextFile(resolvedPath);
  const config = JSON.parse(content) as T;

  // Validate required base fields using the schema
  const validation = CLIConfigSchema.safeParse(config);
  if (!validation.success) {
    const issues = validation.error.issues.map((i) => i.message).join(', ');
    throw new Error(`Invalid CLI config at ${configPath}: ${issues}`);
  }

  return config;
}

/**
 * Type helper for creating extended CLI config interfaces.
 *
 * @example
 * ```typescript
 * type MyConfig = ExtendedCLIConfig<{
 *   CustomField: string;
 *   NestedConfig: { option: boolean };
 * }>;
 * ```
 */
export type ExtendedCLIConfig<T> = CLIConfig & T;

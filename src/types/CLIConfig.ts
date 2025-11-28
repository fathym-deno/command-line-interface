import { z } from '../.deps.ts';

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
   * Can be a single path string (for backward compatibility) or an array of CLICommandSource objects.
   * Each source can specify a Path and an optional Root prefix for command keys.
   * Defaults to `./commands` when undefined.
   */
  Commands?: string | CLICommandSource[];

  /**
   * Root folder containing CLI templates.
   * May be absolute or relative. Defaults to `./template`.
   */
  Templates?: string;
};

/**
 * Zod schema for validating a CLICommandSource object.
 */
export const CLICommandSourceSchema = z.object({
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
    .union([z.string(), z.array(CLICommandSourceSchema)])
    .optional()
    .describe(
      "Path(s) to CLI command folder(s). Can be a string or array of CLICommandSource objects. Defaults to './commands'.",
    ),
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

import { z } from "../.deps.ts";

/**
 * Represents the structure of the root CLI configuration (`.cli.json`).
 * This governs the CLI’s identity, entry tokens, command structure, and versioning.
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
   * Root folder containing CLI commands and group definitions.
   * May be absolute or relative. Defaults to `./commands`.
   */
  Commands?: string;

  /**
   * Root folder containing CLI templates.
   * May be absolute or relative. Defaults to `./template`.
   */
  Templates?: string;
};

/**
 * Zod schema for validating a CLIConfig object.
 * Used for parsing `.cli.json`, generating usage help,
 * and resolving the CLI's token, name, and version.
 */
export const CLIConfigSchema: z.ZodType<CLIConfig> = z.object({
  Name: z
    .string()
    .min(1, "CLI name is required.")
    .describe("A user-facing, friendly name for the CLI."),

  Tokens: z
    .array(z.string())
    .min(1, "At least one CLI token is required.")
    .describe('CLI aliases, e.g. ["openindustrial", "oi"]'),

  Version: z
    .string()
    .min(1, "CLI version is required.")
    .describe("Version shown in help output and CLI logs."),

  Description: z
    .string()
    .optional()
    .describe("Optional description of what this CLI is for."),

  Commands: z
    .string()
    .optional()
    .default("./commands")
    .describe("Path to the CLI commands folder. Defaults to './commands'."),
});

/**
 * Inferred runtime type from CLIConfigSchema.
 * Matches the validated structure used throughout the CLI engine.
 */
export type CLIConfigSchema = z.infer<typeof CLIConfigSchema>;

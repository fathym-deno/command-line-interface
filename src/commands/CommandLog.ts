import { z } from "../.deps.ts";

/**
 * Logging interface available in command handlers.
 *
 * Provides four logging methods for different output types. All methods
 * accept variadic arguments that are formatted and written to stdout/stderr.
 *
 * @example
 * ```typescript
 * Command('deploy', 'Deploy the application')
 *   .Run(({ Log }) => {
 *     Log.Info('Starting deployment...');
 *     Log.Warn('This will overwrite existing files');
 *     Log.Error('Deployment failed!');
 *     Log.Success('Deployment complete!');
 *   });
 * ```
 *
 * @see {@link CommandContext} - Where Log is available
 */
export type CommandLog = {
  /** Log standard output (default level) */
  Info: (...args: unknown[]) => void;

  /** Log warning messages (highlighted) */
  Warn: (...args: unknown[]) => void;

  /** Log error messages (error output) */
  Error: (...args: unknown[]) => void;

  /** Log success messages (success indicator) */
  Success: (...args: unknown[]) => void;
};

const fnSchema = (desc: string) =>
  z
    .custom<(...args: unknown[]) => void>(
      (val): val is (...args: unknown[]) => void => typeof val === "function",
    )
    .describe(desc);

export const CommandLogSchema = z.object({
  Info: fnSchema("Log info output"),
  Warn: fnSchema("Log warning output"),
  Error: fnSchema("Log error output"),
  Success: fnSchema("Log success output"),
}) as unknown as z.ZodType<CommandLog>;

export function isCommandLog(value: unknown): value is CommandLog {
  return CommandLogSchema.safeParse(value).success;
}

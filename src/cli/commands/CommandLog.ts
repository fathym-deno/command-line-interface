import { z } from '../.deps.ts';

/**
 * Standard logging interface injected into all command contexts.
 */
export type CommandLog = {
  Info: (...args: unknown[]) => void;
  Warn: (...args: unknown[]) => void;
  Error: (...args: unknown[]) => void;
  Success: (...args: unknown[]) => void;
};

/**
 * Zod schema for validating the logging interface.
 */
export const CommandLogSchema: z.ZodType<CommandLog> = z.object({
  Info: z.function().args(z.any()).returns(z.void()).describe(
    'Log info output',
  ),
  Warn: z.function().args(z.any()).returns(z.void()).describe(
    'Log warning output',
  ),
  Error: z.function().args(z.any()).returns(z.void()).describe(
    'Log error output',
  ),
  Success: z.function().args(z.any()).returns(z.void()).describe(
    'Log success output',
  ),
});

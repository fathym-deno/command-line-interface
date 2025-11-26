import { z } from '../.deps.ts';

export type CommandLog = {
  Info: (...args: unknown[]) => void;
  Warn: (...args: unknown[]) => void;
  Error: (...args: unknown[]) => void;
  Success: (...args: unknown[]) => void;
};

const fnSchema = (desc: string) =>
  z
    .custom<(...args: unknown[]) => void>(
      (val): val is (...args: unknown[]) => void => typeof val === 'function',
    )
    .describe(desc);

export const CommandLogSchema = z.object({
  Info: fnSchema('Log info output'),
  Warn: fnSchema('Log warning output'),
  Error: fnSchema('Log error output'),
  Success: fnSchema('Log success output'),
}) as unknown as z.ZodType<CommandLog>;

export function isCommandLog(value: unknown): value is CommandLog {
  return CommandLogSchema.safeParse(value).success;
}

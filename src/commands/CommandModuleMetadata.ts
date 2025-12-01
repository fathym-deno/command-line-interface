import { z } from '../.deps.ts';

/**
 * Represents the metadata for a single CLI command module.
 * Includes derived args/flags details for richer help output.
 */
export type CommandModuleMetadata = {
  Name: string;
  Description?: string;
  Usage?: string;
  Examples?: string[];
  Args?: Array<{
    Name: string;
    Description?: string;
    Optional?: boolean;
    /** When true, this arg accepts a file path or inline JSON */
    AcceptsFile?: boolean;
  }>;
  Flags?: Array<{
    Name: string;
    Description?: string;
    Optional?: boolean;
    /** When true, this flag accepts a file path or inline JSON */
    AcceptsFile?: boolean;
  }>;
};

/**
 * Zod schema to validate the structure of the CommandModuleMetadata.
 */
export const CommandModuleMetadataSchema: z.ZodObject<
  {
    Name: z.ZodString;
    Description: z.ZodOptional<z.ZodString>;
    Usage: z.ZodOptional<z.ZodString>;
    Examples: z.ZodOptional<z.ZodArray<z.ZodString>>;
    Args: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            Name: z.ZodString;
            Description: z.ZodOptional<z.ZodString>;
            Optional: z.ZodOptional<z.ZodBoolean>;
            AcceptsFile: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$strip
        >
      >
    >;
    Flags: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            Name: z.ZodString;
            Description: z.ZodOptional<z.ZodString>;
            Optional: z.ZodOptional<z.ZodBoolean>;
            AcceptsFile: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
> = z.object({
  Name: z
    .string()
    .min(1, 'Command name is required.')
    .describe(
      'A short, human-readable label for the command. Shown in help UIs and documentation.',
    ),

  Description: z
    .string()
    .optional()
    .describe(
      'A brief description of what this command does. Appears in help output and introspection tools.',
    ),

  Usage: z
    .string()
    .optional()
    .describe(
      'Optional usage string showing how to invoke this command. If omitted, it will be inferred from schema.',
    ),

  Examples: z
    .array(z.string())
    .optional()
    .describe(
      "Optional example invocations. Each entry should be a CLI string, e.g. 'oi dev --verbose'.",
    ),

  Args: z
    .array(
      z.object({
        Name: z.string(),
        Description: z.string().optional(),
        Optional: z.boolean().optional(),
        AcceptsFile: z.boolean().optional(),
      }),
    )
    .optional()
    .describe('Positional arguments for the command (derived from schema).'),

  Flags: z
    .array(
      z.object({
        Name: z.string(),
        Description: z.string().optional(),
        Optional: z.boolean().optional(),
        AcceptsFile: z.boolean().optional(),
      }),
    )
    .optional()
    .describe('Flags for the command (derived from schema).'),
});

/**
 * Type inferred from the CommandModuleMetadataSchema.
 */
export type CommandModuleMetadataSchema = z.infer<
  typeof CommandModuleMetadataSchema
>;

/**
 * Runtime type guard for CommandModuleMetadata.
 */
export function isCommandModuleMetadata(
  value: unknown,
): value is CommandModuleMetadata {
  return CommandModuleMetadataSchema.safeParse(value).success;
}

import { z } from '../.deps.ts';
import {
  type CommandModuleMetadata,
  CommandModuleMetadataSchema,
} from '../commands/CommandModuleMetadata.ts';

/**
 * Represents the structured context used by the HelpCommand
 * to dynamically render help output for the CLI.
 */
export type HelpContext = {
  /**
   * Optional header shown at the top of help output.
   * Used to label a major section or indicate a CLI scope.
   */
  Header?: string;

  /**
   * Intro block shown before detailed sections.
   * Typically used for the root CLI overview (name, version, usage).
   */
  Intro?: {
    Name: string;
    Version: string;
    Description?: string;
    Usage?: string;
    Examples?: string[];
  };

  /**
   * Ordered list of help blocks rendered in sequence.
   * Each section defines a labeled chunk of CLI help UI.
   */
  Sections?: Array<
    | ({
      type: 'CommandDetails';
    } & CommandModuleMetadata)
    | ({
      type: 'GroupDetails';
    } & CommandModuleMetadata)
    | {
      type: 'CommandList';
      title: string;
      items: CommandModuleMetadata[];
    }
    | {
      type: 'GroupList';
      title: string;
      items: CommandModuleMetadata[];
    }
    | ({
      type: 'Error';
      message: string;
      suggestion?: string;
    } & Partial<CommandModuleMetadata>)
  >;
};

/**
 * Zod schema for validating a HelpContext.
 * Used to enforce runtime type safety, introspection,
 * and to match the flag structure of the HelpCommand.
 */
export const HelpContextSchema: z.ZodType<HelpContext> = z.object({
  Header: z.string().optional(),

  Intro: z
    .object({
      Name: z.string(),
      Version: z.string(),
      Description: z.string().optional(),
      Usage: z.string().optional(),
      Examples: z.array(z.string()).optional(),
    })
    .optional(),

  Sections: z
    .array(
      z.discriminatedUnion('type', [
        // A section describing a specific command (usage, examples, etc.)
        CommandModuleMetadataSchema.extend({
          type: z.literal('CommandDetails'),
        }),

        // A section describing a command group (e.g. scaffold/, deploy/)
        CommandModuleMetadataSchema.extend({
          type: z.literal('GroupDetails'),
        }),

        // A flat list of subcommands under a group
        z.object({
          type: z.literal('CommandList'),
          title: z.string(),
          items: z.array(CommandModuleMetadataSchema),
        }),

        // A flat list of subgroups under a group
        z.object({
          type: z.literal('GroupList'),
          title: z.string(),
          items: z.array(CommandModuleMetadataSchema),
        }),

        // A fallback error section when no command match was found
        CommandModuleMetadataSchema.partial().extend({
          type: z.literal('Error'),
          message: z.string(),
          suggestion: z.string().optional(),
        }),
      ]),
    )
    .optional(),
});

/**
 * Inferred runtime type from HelpContextSchema.
 * Matches the validated structure of CLI help flags.
 */
export type HelpContextSchema = z.infer<typeof HelpContextSchema>;

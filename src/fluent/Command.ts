import type { CommandParams } from '../commands/CommandParams.ts';
import { CommandModuleBuilder } from './CommandModuleBuilder.ts';

/**
 * Create a new command using the fluent builder API.
 *
 * This is the recommended way to define CLI commands. The builder provides
 * a chainable interface for configuring arguments, flags, services, and
 * the run handler with full TypeScript type inference.
 *
 * ## Fluent Chain Methods
 *
 * The builder methods should be called in this general order:
 *
 * ```
 * Command(name, description)
 *   .Args(schema)      // Define positional arguments
 *   .Flags(schema)     // Define command flags
 *   .Params(class)     // Custom params class (optional)
 *   .Services(fn)      // Inject dependencies (optional)
 *   .Commands(fn)      // Define subcommands (optional)
 *   .Init(fn)          // Pre-run hook (optional)
 *   .Run(fn)           // Main logic (required)
 *   .DryRun(fn)        // Dry-run handler (optional)
 *   .Cleanup(fn)       // Post-run hook (optional)
 * ```
 *
 * @param name - Display name shown in help output
 * @param description - Brief description of the command's purpose
 * @returns A CommandModuleBuilder for chaining configuration
 *
 * @example Simple command
 * ```typescript
 * import { Command } from '@fathym/cli';
 *
 * export default Command('hello', 'Print a greeting')
 *   .Run(({ Log }) => {
 *     Log.Info('Hello, World!');
 *   });
 * ```
 *
 * @example Command with arguments and flags
 * ```typescript
 * import { Command } from '@fathym/cli';
 * import { z } from 'zod';
 *
 * export default Command('greet', 'Greet someone by name')
 *   .Args(z.tuple([
 *     z.string().describe('Name to greet').meta({ argName: 'name' })
 *   ]))
 *   .Flags(z.object({
 *     loud: z.boolean().optional().describe('Shout the greeting'),
 *   }))
 *   .Run(({ Params, Log }) => {
 *     const name = Params.Arg(0) ?? 'World';
 *     const msg = `Hello, ${name}!`;
 *     Log.Info(Params.Flag('loud') ? msg.toUpperCase() : msg);
 *   });
 * ```
 *
 * @example Command with services
 * ```typescript
 * import { Command, CLIDFSContextManager } from '@fathym/cli';
 *
 * export default Command('deploy', 'Deploy the project')
 *   .Services(async (ctx, ioc) => ({
 *     dfs: await ioc.Resolve(CLIDFSContextManager),
 *   }))
 *   .Run(async ({ Services, Log }) => {
 *     const projectDFS = await Services.dfs.GetProjectDFS();
 *     Log.Info(`Deploying from: ${projectDFS.Root}`);
 *   });
 * ```
 *
 * @typeParam A - Tuple type for positional arguments
 * @typeParam F - Record type for command flags
 * @typeParam P - CommandParams subclass for typed parameter access
 */
export function Command<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
>(
  name: string,
  description: string,
): CommandModuleBuilder<A, F, P, Record<string, unknown>> {
  return new CommandModuleBuilder<A, F, P, Record<string, unknown>>(
    name,
    description,
  );
}

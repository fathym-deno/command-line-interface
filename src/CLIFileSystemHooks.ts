import type { DFSFileHandler } from "./.deps.ts";
import type { CLICommandEntry } from "./types/CLICommandEntry.ts";
import type { CLIInitFn } from "./types/CLIInitFn.ts";
import type { CLICommandSource, CLIConfig } from "./types/CLIConfig.ts";
import type { CommandModule } from "./commands/CommandModule.ts";
import type { TemplateLocator } from "./templates/TemplateLocator.ts";

/**
 * Abstraction layer for CLI filesystem operations.
 *
 * CLIFileSystemHooks defines how the CLI framework interacts with the filesystem
 * for loading configuration, commands, and templates. This interface enables
 * different deployment strategies:
 *
 * - **LocalDevCLIFileSystemHooks**: Development mode with dynamic imports
 * - **EmbeddedCLIFileSystemHooks**: Compiled mode with bundled assets
 *
 * @example Custom implementation for embedded CLI
 * ```typescript
 * import { CLI, CLICommandResolver } from '@fathym/cli';
 * import { EmbeddedCLIFileSystemHooks } from './EmbeddedCLIFileSystemHooks.ts';
 *
 * const cli = new CLI({
 *   resolver: new CLICommandResolver(new EmbeddedCLIFileSystemHooks()),
 * });
 *
 * await cli.RunFromArgs(Deno.args);
 * ```
 *
 * @see {@link LocalDevCLIFileSystemHooks} - Development implementation
 * @see {@link CLICommandResolver} - Uses hooks for command resolution
 */
export interface CLIFileSystemHooks {
  /**
   * Resolve all command entry paths from a command source.
   *
   * Walks the command source directory and returns a map of command keys
   * to their entry definitions.
   *
   * @param source - Command source configuration with path and optional root prefix
   * @returns Map of command keys to command entries
   */
  ResolveCommandEntryPaths(
    source: CLICommandSource,
  ): Promise<Map<string, CLICommandEntry>>;

  /**
   * Resolve the CLI configuration from command-line arguments.
   *
   * Attempts to find and load `.cli.json` from:
   * 1. Explicit path in first argument
   * 2. Current working directory
   *
   * @param args - Raw command-line arguments
   * @returns Configuration object, resolved path, and remaining arguments
   */
  ResolveConfig(args: string[]): Promise<{
    config: CLIConfig;
    resolvedPath: string;
    remainingArgs: string[];
  }>;

  /**
   * Load the CLI initialization function from a path.
   *
   * The init function is called before command execution to register
   * services in the IoC container.
   *
   * @param path - Path to the init module (typically `.cli.init.ts`)
   * @returns The init function and its resolved path
   */
  LoadInitFn(
    path: string,
  ): Promise<{ initFn: CLIInitFn | undefined; resolvedInitPath: string }>;

  /**
   * Load a command module from a file path.
   *
   * Dynamically imports the command module and validates its structure.
   *
   * @param path - Path to the command module
   * @returns The loaded command module
   */
  LoadCommandModule(path: string): Promise<CommandModule>;

  /**
   * Resolve the template locator for template operations.
   *
   * Returns a template locator configured for the given DFS handler,
   * or undefined if templates are not configured.
   *
   * @param dfsHandler - Optional DFS handler for template resolution
   * @returns Template locator or undefined
   */
  ResolveTemplateLocator(
    dfsHandler?: DFSFileHandler,
  ): Promise<TemplateLocator | undefined>;
}

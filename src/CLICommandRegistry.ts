import type { CLICommandEntry } from './types/CLICommandEntry.ts';

/**
 * In-memory registry for programmatically defined CLI commands.
 *
 * The CLICommandRegistry allows commands to be registered at runtime without
 * needing filesystem-based command modules. Commands registered here are merged
 * with filesystem commands during execution, with in-memory commands taking
 * precedence over filesystem commands with the same key.
 *
 * @example Basic usage
 * ```typescript
 * import { CLI, CLICommandRegistry, Command } from '@fathym/cli';
 *
 * const cli = new CLI();
 * const registry = await cli.ioc.Resolve(CLICommandRegistry);
 *
 * registry.RegisterCommand('greet', {
 *   Command: Command('greet', 'Say hello')
 *     .Run(({ Log }) => Log.Info('Hello!')),
 *   FilePath: 'in-memory',
 * });
 *
 * await cli.RunFromArgs(Deno.args);
 * ```
 *
 * @example Registering multiple commands
 * ```typescript
 * registry.RegisterCommand('api/health', healthCommand);
 * registry.RegisterCommand('api/status', statusCommand);
 * registry.RegisterCommand('db/migrate', migrateCommand);
 * ```
 *
 * @see {@link CLI} - Main CLI orchestrator
 * @see {@link CLICommandResolver} - Resolves filesystem commands
 */
export class CLICommandRegistry {
  protected commands: Map<string, CLICommandEntry>;

  constructor() {
    this.commands = new Map<string, CLICommandEntry>();
  }

  /**
   * Register a command with the given key.
   *
   * The key determines how the command is invoked. Nested keys use forward
   * slashes (e.g., `api/health` invokes as `mycli api health`).
   *
   * @param key - Command key (e.g., 'deploy', 'db/migrate')
   * @param entry - Command entry containing the command and metadata
   *
   * @example
   * ```typescript
   * registry.RegisterCommand('deploy', {
   *   Command: deployCommand,
   *   FilePath: 'in-memory',
   * });
   * ```
   */
  public RegisterCommand(key: string, entry: CLICommandEntry): void {
    this.commands.set(key, entry);
  }

  /**
   * Get a copy of all registered commands.
   *
   * Returns a new Map to prevent external modification of the internal
   * registry state.
   *
   * @returns Map of command keys to command entries
   */
  public GetCommands(): Map<string, CLICommandEntry> {
    return new Map(this.commands);
  }
}

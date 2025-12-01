import type { CLICommandSource } from '../types/CLIConfig.ts';

/**
 * Normalizes the Commands configuration to a consistent array format.
 *
 * @param commands - The raw Commands value from CLIConfig (string, string[], CLICommandSource[], or undefined)
 * @returns An array of CLICommandSource objects
 */
export function normalizeCommandSources(
  commands: string | string[] | CLICommandSource[] | undefined,
): CLICommandSource[] {
  // Default to './commands' when undefined
  if (commands === undefined) {
    return [{ Path: './commands' }];
  }

  // Convert string to single-element array
  if (typeof commands === 'string') {
    return [{ Path: commands }];
  }

  // Handle empty array
  if (commands.length === 0) {
    return [];
  }

  // Check if it's an array of strings (first element is a string, not an object)
  if (typeof commands[0] === 'string') {
    return (commands as string[]).map((path) => ({ Path: path }));
  }

  // Already an array of CLICommandSource objects
  return commands as CLICommandSource[];
}

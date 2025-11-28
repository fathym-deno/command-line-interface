import type { CLICommandSource } from '../types/CLIConfig.ts';

/**
 * Normalizes the Commands configuration to a consistent array format.
 *
 * @param commands - The raw Commands value from CLIConfig (string, array, or undefined)
 * @returns An array of CLICommandSource objects
 */
export function normalizeCommandSources(
  commands: string | CLICommandSource[] | undefined,
): CLICommandSource[] {
  // Default to './commands' when undefined
  if (commands === undefined) {
    return [{ Path: './commands' }];
  }

  // Convert string to single-element array
  if (typeof commands === 'string') {
    return [{ Path: commands }];
  }

  // Already an array, return as-is
  return commands;
}

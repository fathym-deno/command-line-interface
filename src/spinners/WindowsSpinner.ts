import type { Spinner } from './Spinner.ts';

/**
 * Classic ASCII spinner compatible with all terminals.
 *
 * The most compatible spinner option, using only basic ASCII characters.
 * Recommended for Windows Command Prompt and legacy terminal environments
 * that may not support Unicode characters.
 *
 * @example Using WindowsSpinner
 * ```typescript
 * import { WindowsSpinner } from '@fathym/cli';
 *
 * // Select based on platform
 * const spinner = Deno.build.os === 'windows'
 *   ? WindowsSpinner
 *   : DotsSpinner;
 * ```
 *
 * Visual: / → - → \ → |
 */
export const WindowsSpinner: Spinner = {
  Frames: ['/', '-', '\\', '|'],
  Interval: 80,
};

import type { Spinner } from './Spinner.ts';

/**
 * Braille-based spinner with smooth 10-frame animation.
 *
 * Best suited for Unix terminals and modern Windows Terminal
 * that support full Unicode rendering.
 *
 * @example Using DotsSpinner
 * ```typescript
 * import { DotsSpinner } from '@fathym/cli';
 *
 * let frameIndex = 0;
 * setInterval(() => {
 *   console.log(`${DotsSpinner.Frames[frameIndex]} Loading...`);
 *   frameIndex = (frameIndex + 1) % DotsSpinner.Frames.length;
 * }, DotsSpinner.Interval);
 * ```
 *
 * Visual: ⠋ → ⠙ → ⠹ → ⠸ → ⠼ → ⠴ → ⠦ → ⠧ → ⠇ → ⠏
 */
export const DotsSpinner: Spinner = {
  Frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  Interval: 80,
};

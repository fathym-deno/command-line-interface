import type { Spinner } from "../spinners/Spinner.ts";

/**
 * Arc-based spinner with circular motion animation.
 *
 * A good alternative for terminals that support Unicode but may have
 * issues with braille characters. Works well in most Unix terminals
 * and modern Windows environments.
 *
 * @example Using ArcSpinner
 * ```typescript
 * import { ArcSpinner } from '@fathym/cli';
 *
 * const frames = ArcSpinner.Frames;
 * // Use with UpdateInline or custom animation
 * ```
 *
 * Visual: ◜ → ◠ → ◝ → ◞ → ◡ → ◟
 */
export const ArcSpinner: Spinner = {
  Frames: ["◜", "◠", "◝", "◞", "◡", "◟"],
  Interval: 80,
};

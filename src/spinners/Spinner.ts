/**
 * Configuration for a CLI spinner animation.
 *
 * Spinners provide visual feedback during long-running operations by cycling
 * through a sequence of characters at a regular interval.
 *
 * @example Creating a custom spinner
 * ```typescript
 * const ClockSpinner: Spinner = {
 *   Frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕'],
 *   Interval: 100,
 * };
 * ```
 *
 * @see {@link DotsSpinner} - Braille-based spinner for Unix
 * @see {@link ArcSpinner} - Arc-based spinner
 * @see {@link WindowsSpinner} - ASCII spinner for Windows CMD
 */
export type Spinner = {
  /**
   * Array of characters or strings to cycle through during animation.
   * Each frame is displayed in sequence before looping back to the start.
   */
  Frames: string[];

  /**
   * Milliseconds between frame updates.
   * Lower values create faster animations. Typical range is 50-150ms.
   */
  Interval: number;
};

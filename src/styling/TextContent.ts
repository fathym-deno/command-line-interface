import type { StyleOptions } from './StyleKeys.ts';

/**
 * Represents text content with optional styling.
 *
 * Used in `UpdateInline` and other styling utilities to combine
 * text with ANSI style options.
 *
 * @example Basic usage
 * ```typescript
 * const content: TextContent = {
 *   Text: 'Success!',
 *   Styles: 'green',
 * };
 * ```
 *
 * @example Multiple styles
 * ```typescript
 * const warning: TextContent = {
 *   Text: 'Warning: Check configuration',
 *   Styles: ['yellow', 'bold'],
 * };
 * ```
 *
 * @see {@link UpdateInlineOptions} - Uses TextContent for prefix/suffix
 * @see {@link buildTextContent} - Renders TextContent to styled string
 */
export type TextContent = {
  /**
   * Style option(s) to apply to the text.
   * Can be a single style string or array of styles.
   */
  Styles?: StyleOptions | StyleOptions[];

  /**
   * The text content to display.
   */
  Text: string;
};

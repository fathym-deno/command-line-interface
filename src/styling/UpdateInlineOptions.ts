import type { WriterSync } from "../.deps.ts";
import type { Spinner } from "../spinners/Spinner.ts";
import type { StyleOptions } from "./StyleKeys.ts";
import type { TextContent } from "./TextContent.ts";

/**
 * Configuration options for the UpdateInline CLI tool.
 *
 * Controls text content, styling, layout, and terminal output behavior
 * for in-place terminal updates.
 *
 * @example Basic text update
 * ```typescript
 * inline.Configure({
 *   Text: 'Loading...',
 *   Styles: 'cyan',
 * });
 * ```
 *
 * @example With prefix and suffix
 * ```typescript
 * inline.Configure({
 *   PrefixText: '→',
 *   Text: 'Processing files',
 *   SuffixText: { Text: '(3/10)', Styles: 'dim' },
 *   Styles: ['white', 'bold'],
 * });
 * ```
 *
 * @see {@link UpdateInline} - Main class using these options
 */
export type UpdateInlineOptions = {
  /**
   * Maximum line width in columns.
   * Lines exceeding this will be wrapped.
   * @default 100
   */
  Columns?: number;

  /**
   * Unique identifier for the inline instance.
   */
  ID?: string;

  /**
   * Number of spaces for indentation.
   */
  Indent?: number;

  /**
   * Number of lines to track for clearing.
   */
  LineCount?: number;

  /**
   * Separator between text content parts.
   * @default ' '
   */
  LineSpacer?: string;

  /**
   * Number of lines to clear before rendering.
   */
  LinesToClear?: number;

  /**
   * Text displayed before the main content.
   * Can be a plain string or styled TextContent.
   */
  PrefixText?: string | TextContent;

  /**
   * Whether to discard stdin input during updates.
   */
  ShouldDiscardingStdin?: boolean;

  /**
   * Whether to show the terminal cursor.
   */
  ShowCursor?: boolean;

  /**
   * Enable spinner animation.
   * Set to `true` for default spinner, or provide custom Spinner config.
   * @note Custom spinner frames not yet supported - use `true` only
   */
  Spinner?: boolean | Spinner;

  /**
   * Style(s) to apply to the first line of output.
   */
  Styles?: StyleOptions | StyleOptions[];

  /**
   * Text displayed after the main content.
   * Can be a plain string or styled TextContent.
   */
  SuffixText?: string | TextContent;

  /**
   * Main text content to display.
   * Can be a plain string or styled TextContent.
   */
  Text?: string | TextContent;

  /**
   * Whether to read from stdin.
   */
  UseStdin?: boolean;

  /**
   * Output writer for terminal output.
   * @default Deno.stderr
   */
  Writer?: WriterSync;
};

import type { WriterSync } from '../.deps.ts';
import type { Spinner } from '../spinners/Spinner.ts';
import type { StyleOptions } from './StyleKeys.ts';
import type { TextContent } from './TextContent.ts';

/**
 * Options used for configuring the UpdateInline CLI tool.
 */
export type UpdateInlineOptions = {
  Columns?: number;

  ID?: string;

  Indent?: number;

  // IsEnabled?: boolean;

  // IsSilent?: boolean;

  LineCount?: number;

  LineSpacer?: string;

  LinesToClear?: number;

  PrefixText?: string | TextContent;

  ShouldDiscardingStdin?: boolean;

  ShowCursor?: boolean;

  Spinner?: boolean | Spinner;

  Styles?: StyleOptions | StyleOptions[];

  SuffixText?: string | TextContent;

  Text?: string | TextContent;

  UseStdin?: boolean;

  Writer?: WriterSync;
};

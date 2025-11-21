import { merge, writeAllSync, type WriterSync } from '../.deps.ts';
import type { UpdateInlineOptions } from './UpdateInlineOptions.ts';
import { appendStyles } from '../utils/appendStyles.ts';
import { buildTextContent } from '../utils/buildTextContent.ts';
import { clearLine } from '../utils/clearLine.ts';

export class UpdateInline {
  // #region Fields
  protected get lineCount(): number {
    const lineCount = this.LastInlined?.split('\n').length ?? 0;

    return lineCount;
  }

  protected options: UpdateInlineOptions;

  protected textEncoder: TextEncoder;

  protected timeout: AbortController;

  protected get writer(): WriterSync {
    return this.options.Writer || Deno.stderr;
  }
  // #endregion

  // #region Properties
  public LastInlined: string;
  // #endregion

  constructor() {
    this.LastInlined = '';

    this.options = {};

    this.textEncoder = new TextEncoder();

    this.timeout = new AbortController();
  }

  // #region API Methods
  public Configure(options: UpdateInlineOptions | string): this {
    if (typeof options === 'string') {
      options = { Text: options };
    }

    const exists = !!this.LastInlined;

    this.options = merge(this.options ?? {}, options ?? {});

    if (
      !(typeof this.options.Spinner === 'undefined') &&
      !(typeof this.options.Spinner === 'boolean')
    ) {
      throw new Deno.errors.NotSupported(
        'Custom spinner frames are not yet supported.',
      );
    }

    if (exists) {
      clearLine(this.writer, this.textEncoder, this.lineCount);
    }

    this.render();

    return this;
  }
  // #endregion

  // #region Helpers
  protected assembleLines(
    text?: string,
    prefix?: string,
    suffix?: string,
    _spinner?: boolean,
  ): string[] {
    const lines: string[][] = [];

    lines.push([
      ...(prefix ? [prefix] : []),
      // ...(spinner ? [spinner] : []),
      ...(text ? [text] : []),
    ]);

    lines.push([...(suffix ? [suffix] : [])]);

    const columns = this.options.Columns ?? 100;

    return lines
      .map((line) => {
        const result = line.join(this.options.LineSpacer || ' ');

        return result.split('').reduce<string[]>((acc, _, i) => {
          if (i % columns === 0) {
            acc.push(result.slice(i, i + columns));
          }
          return acc;
        }, []);
      })
      .flatMap((l) => l);
  }

  protected render(): void {
    let styles = this.options.Styles;

    if (styles && !Array.isArray(styles)) {
      styles = [styles];
    }

    const [text, prefix, suffix] = [
      buildTextContent(this.options.Text),
      buildTextContent(this.options.PrefixText),
      buildTextContent(this.options.SuffixText),
    ];

    const lines: string[] = this.assembleLines(text, prefix, suffix);

    const result = lines.reduce((res, line) => {
      let fullLine = '';

      if (line) {
        fullLine = line;

        if (fullLine && line === lines[0]) {
          fullLine = styles?.reduce((txt, nextStyle) => {
            return appendStyles(txt, nextStyle);
          }, fullLine) ?? fullLine;
        }
      }

      return !fullLine ? res : !res ? fullLine : `${res}\n${fullLine}`;
    }, '');

    if (result) {
      this.writer.writeSync(this.textEncoder.encode(`${result}\n`));

      this.LastInlined = result;
    }

    writeAllSync(this.writer, this.textEncoder.encode(`\u001B[100H`));
  }
  // #endregion
}

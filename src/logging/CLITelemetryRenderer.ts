import { Colors, type WriterSync } from '../.deps.ts';

type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'success';

export class CLITelemetryRenderer {
  protected readonly encoder = new TextEncoder();

  constructor(protected readonly writer: WriterSync = Deno.stderr) {}

  public render(
    level: Level,
    message: string,
    attributes?: Record<string, unknown>,
  ): void {
    const prefix = this.prefixFor(level);
    const formattedAttrs = this.formatAttributes(attributes);

    const line = [prefix, message, formattedAttrs].filter(Boolean).join(' ');

    this.writer.writeSync(this.encoder.encode(`${line}\n`));
  }

  protected prefixFor(level: Level): string {
    switch (level) {
      case 'debug':
        return Colors.cyan('…');
      case 'info':
        return Colors.blue('ℹ');
      case 'warn':
        return Colors.yellow('⚠');
      case 'error':
        return Colors.red('✖');
      case 'fatal':
        return Colors.red('💥');
      case 'success':
        return Colors.green('✅');
      default:
        return '';
    }
  }

  protected formatAttributes(
    attrs?: Record<string, unknown>,
  ): string | undefined {
    if (!attrs || !Object.keys(attrs).length) return undefined;

    try {
      return Colors.dim(JSON.stringify(attrs));
    } catch {
      return Colors.dim(String(attrs));
    }
  }
}

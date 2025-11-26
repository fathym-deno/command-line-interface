import { writeAllSync, type WriterSync } from '../.deps.ts';

/**
 * Hides the terminal cursor
 */
export function hideCursor(writer: WriterSync, encoder: TextEncoder): void {
  writeAllSync(writer, encoder.encode('\u001B[?25l'));
}

import { writeAllSync, type WriterSync } from "../.deps.ts";

/**
 * Shows the terminal cursor
 */
export function showCursor(writer: WriterSync, encoder: TextEncoder): void {
  writeAllSync(writer, encoder.encode("\u001B[?25h"));
}

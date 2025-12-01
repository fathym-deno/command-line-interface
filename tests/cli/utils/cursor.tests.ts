import { assertEquals } from '../../test.deps.ts';
import { hideCursor } from '../../../src/utils/hideCursor.ts';
import { showCursor } from '../../../src/utils/showCursor.ts';
import { clearLine } from '../../../src/utils/clearLine.ts';

class BufferWriter {
  public chunks: Uint8Array[] = [];
  writeSync(p: Uint8Array): number {
    this.chunks.push(p.slice());
    return p.length;
  }
  toString() {
    const decoder = new TextDecoder();
    return this.chunks.map((c) => decoder.decode(c)).join('');
  }
}

Deno.test('cursor helpers write expected escape sequences', () => {
  const writer = new BufferWriter();
  const encoder = new TextEncoder();

  hideCursor(writer, encoder);
  showCursor(writer, encoder);
  clearLine(writer, encoder, 1);
  clearLine(writer, encoder, 2, 3);

  const output = writer.toString();
  assertEquals(
    output,
    '\u001B[?25l\u001B[?25h\u001B[1F\u001B[2K\r\u001B[3H\u001B[2K\r\u001B[1A\u001B[2K\r',
  );
});

import { assertEquals, stripColor } from '../../test.deps.ts';
import { createCliTelemetryLogger } from '../../../src/cli/logging/createCliTelemetryLogger.ts';
import type { WriterSync } from '../../../src/cli/.deps.ts';

class BufferWriter implements WriterSync {
  private chunks: Uint8Array[] = [];

  writeSync(p: Uint8Array): number {
    this.chunks.push(p.slice());
    return p.length;
  }

  toString(): string {
    const combined = this.chunks.reduce((acc, chunk) => {
      const next = new Uint8Array(acc.length + chunk.length);
      next.set(acc);
      next.set(chunk, acc.length);
      return next;
    }, new Uint8Array());

    return new TextDecoder().decode(combined);
  }
}

Deno.test('createCliTelemetryLogger – applies base attributes and context', () => {
  const writer = new BufferWriter();
  const logger = createCliTelemetryLogger({
    baseAttributes: { cli: 'test' },
    writer,
  });

  logger.warn('oops', { step: 1 });

  const text = stripColor(writer.toString().trim());
  assertEquals(text, '⚠ oops {"cli":"test","step":1}');
});

Deno.test('createCliTelemetryLogger – withContext merges attributes', () => {
  const writer = new BufferWriter();
  const logger = createCliTelemetryLogger({
    baseAttributes: { cli: 'test' },
    writer,
  }).withContext({ task: 'build' });

  logger.info('ok');

  const text = stripColor(writer.toString().trim());
  assertEquals(text, 'ℹ ok {"cli":"test","task":"build"}');
});

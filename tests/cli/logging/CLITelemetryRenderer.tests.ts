import { assert, assertEquals } from '../../test.deps.ts';
import { CLITelemetryRenderer } from '../../../src/cli/logging/CLITelemetryRenderer.ts';
import { Colors, type WriterSync } from '../../../src/cli/.deps.ts';

class BufferWriter implements WriterSync {
  private readonly chunks: Uint8Array[] = [];

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

Deno.test('CLITelemetryRenderer – renders prefixes and attributes', () => {
  const writer = new BufferWriter();
  const renderer = new CLITelemetryRenderer(writer);

  renderer.render('info', 'hello world', { foo: 'bar' });

  const line = writer.toString().trim();
  assertEquals(line, `${Colors.blue('ℹ')} hello world ${Colors.dim('{"foo":"bar"}')}`);
});

Deno.test('CLITelemetryRenderer – omits attributes when none provided', () => {
  const writer = new BufferWriter();
  const renderer = new CLITelemetryRenderer(writer);

  renderer.render('success', 'done');

  const line = writer.toString().trim();
  assertEquals(line, `${Colors.green('✅')} done`);
});

Deno.test('CLITelemetryRenderer – falls back on unserializable attributes', () => {
  const writer = new BufferWriter();
  const renderer = new CLITelemetryRenderer(writer);

  const circular: Record<string, unknown> = {};
  circular.self = circular;

  renderer.render('fatal', 'boom', circular);

  const line = writer.toString().trim();
  assert(line.startsWith(`${Colors.red('💥')} boom`));
  assert(line.includes('[object Object]'));
});

import type { WriterSync } from '../.deps.ts';

type TelemetryWriterGlobal = { __telemetryWriter?: WriterSync };

export function captureLogs(
  fn: () => Promise<void>,
  useOrig: boolean = false,
): Promise<string> {
  const encoder = new TextEncoder();
  const buffer: Uint8Array[] = [];

  const writer: WriterSync = {
    writeSync(p: Uint8Array): number {
      buffer.push(p.slice());
      // Tee telemetry output to stderr so it is visible during tests.
      // This preserves the in-memory buffer for assertions.
      try {
        Deno.stderr.writeSync(p);
      } catch {
        // Ignore tee failures; still capture in buffer.
      }
      return p.length;
    },
  };

  // Expose writer via global symbol so CLI can pick it up for telemetry renderer.
  const globalAny = globalThis as TelemetryWriterGlobal;
  const prevWriter = globalAny.__telemetryWriter;
  globalAny.__telemetryWriter = writer;

  // Also capture console fallback paths for help output still using console.
  const originalLog = console.log;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalWarn = console.warn;

  console.log = (...args: unknown[]) => {
    writer.writeSync(encoder.encode(args.map((a) => String(a)).join(' ') + '\n'));
    if (useOrig) originalLog(...args);
  };
  console.info = (...args: unknown[]) => {
    writer.writeSync(encoder.encode(args.map((a) => String(a)).join(' ') + '\n'));
    if (useOrig) originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    writer.writeSync(encoder.encode(args.map((a) => String(a)).join(' ') + '\n'));
    if (useOrig) originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    writer.writeSync(encoder.encode(args.map((a) => String(a)).join(' ') + '\n'));
    if (useOrig) originalError(...args);
  };

  return fn()
    .finally(() => {
      console.log = originalLog;
      console.error = originalError;
      console.info = originalInfo;
      console.warn = originalWarn;

      if (prevWriter) {
        globalAny.__telemetryWriter = prevWriter;
      } else {
        delete globalAny.__telemetryWriter;
      }
    })
    .then(() => {
      const combined = buffer.reduce((acc, chunk) => {
        const next = new Uint8Array(acc.length + chunk.length);
        next.set(acc);
        next.set(chunk, acc.length);
        return next;
      }, new Uint8Array());

      return new TextDecoder().decode(combined);
    });
}

import { assertEquals, stripColor } from "../../test.deps.ts";
import { createCliTelemetryLogger } from "../../../src/logging/createCliTelemetryLogger.ts";
import type { WriterSync } from "../../../src/.deps.ts";

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

Deno.test("createCliTelemetryLogger – applies base attributes and context", () => {
  const writer = new BufferWriter();
  const logger = createCliTelemetryLogger({
    baseAttributes: { cli: "test" },
    writer,
  });

  logger.warn("oops", { step: 1 });

  const text = stripColor(writer.toString().trim());
  assertEquals(text, '⚠ oops {"cli":"test","step":1}');
});

Deno.test("createCliTelemetryLogger – withContext merges attributes", () => {
  const writer = new BufferWriter();
  const logger = createCliTelemetryLogger({
    baseAttributes: { cli: "test" },
    writer,
  }).withContext({ task: "build" });

  logger.info("ok");

  const text = stripColor(writer.toString().trim());
  assertEquals(text, 'ℹ ok {"cli":"test","task":"build"}');
});

Deno.test("createCliTelemetryLogger – renders all levels with context", () => {
  const writer = new BufferWriter();
  const logger = createCliTelemetryLogger({ writer }).withContext({
    cli: "ctx",
  });

  logger.debug("dbg");
  logger.info("info");
  logger.warn("warn");
  logger.error("err");
  logger.fatal("boom");
  logger.withContext({ stage: "child" }).info("child");

  const lines = stripColor(writer.toString().trim()).split("\n");
  assertEquals(lines[0], '… dbg {"cli":"ctx"}');
  assertEquals(lines[1], 'ℹ info {"cli":"ctx"}');
  assertEquals(lines[2], '⚠ warn {"cli":"ctx"}');
  assertEquals(lines[3], '✖ err {"cli":"ctx"}');
  assertEquals(lines[4], '💥 boom {"cli":"ctx"}');
  assertEquals(lines[5], 'ℹ child {"cli":"ctx","stage":"child"}');
});

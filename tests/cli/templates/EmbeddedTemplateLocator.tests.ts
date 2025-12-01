import { assertEquals, assertThrows } from "../../test.deps.ts";
import { EmbeddedTemplateLocator } from "../../../src/templates/EmbeddedTemplateLocator.ts";

Deno.test("EmbeddedTemplateLocator – normalizes prefixes and lists files", async () => {
  const locator = new EmbeddedTemplateLocator({
    "base/file.txt": "hi",
    "base/nested/inner.txt": "in",
  });

  const files = await locator.ListFiles("/tmp/templates/base");
  assertEquals(files.sort(), [
    "./templates/base/file.txt",
    "./templates/base/nested/inner.txt",
  ]);

  const content = await locator.ReadTemplateFile("./templates/base/file.txt");
  assertEquals(content, "hi");
});

Deno.test("EmbeddedTemplateLocator – throws when missing template", () => {
  const locator = new EmbeddedTemplateLocator({});
  assertThrows(() => locator.ReadTemplateFile("./templates/missing.txt"));
});

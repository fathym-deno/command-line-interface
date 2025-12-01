import { assertEquals, assertRejects } from "../../test.deps.ts";
import { DFSTemplateLocator } from "../../../src/templates/DFSTemplateLocator.ts";
import type { DFSFileHandler } from "../../../src/.deps.ts";

const contents = {
  "templates/base/file.txt": "hello",
  "templates/base/other.hbs": "world",
};
const samplePaths = [
  "./templates/base/file.txt",
  "./templates/base/other.hbs",
  "./templates/extra/skip.txt",
];

function createStubDFS(): DFSFileHandler {
  const value = contents as Record<string, string>;
  const dfs = {
    Root: ".",
    LoadAllPaths() {
      return samplePaths;
    },
    GetFileInfo(path: string) {
      const clean = path.replace(/^\.\/?/, "");
      if (!(clean in contents)) return undefined;
      return {
        Path: clean,
        Contents: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(value[clean]));
            controller.close();
          },
        }),
      };
    },
    ResolvePath(..._parts: string[]) {
      return "";
    },
    async WriteFile() {},
    async RemoveFile() {},
  };

  return dfs as unknown as DFSFileHandler;
}

Deno.test("DFSTemplateLocator – lists files under template prefix and reads content", async () => {
  const locator = new DFSTemplateLocator(createStubDFS());

  const files = await locator.ListFiles("./templates/base");
  assertEquals(files.sort(), [
    "./templates/base/file.txt",
    "./templates/base/other.hbs",
  ]);

  const text = await locator.ReadTemplateFile("./templates/base/file.txt");
  assertEquals(text, "hello");
});

Deno.test("DFSTemplateLocator – throws when template missing", async () => {
  const locator = new DFSTemplateLocator(createStubDFS());
  await assertRejects(
    () => locator.ReadTemplateFile("templates/missing"),
    Error,
  );
});

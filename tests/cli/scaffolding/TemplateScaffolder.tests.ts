import { TemplateScaffolder } from "../../../src/scaffolding/TemplateScaffolder.ts";
import { TemplateLocator } from "../../../src/templates/TemplateLocator.ts";
import { assertEquals, DFSFileHandler } from "../../test.deps.ts";

class InMemoryDFS extends DFSFileHandler {
  public Root = ".";

  constructor(private files: Map<string, string> = new Map()) {
    super({});
  }

  override loadAllPaths(): Promise<string[]> {
    return Promise.resolve(Array.from(this.files.keys()));
  }

  override async LoadAllPaths(): Promise<string[]> {
    return await Promise.resolve(Array.from(this.files.keys()));
  }

  async GetFileInfo(
    path: string,
    _defaultFileName?: string,
    _extensions?: string[],
    _useCascading?: boolean,
  ) {
    const normalized = path.replace(/\\/g, "/");
    if (!this.files.has(normalized)) return undefined;

    const contents = this.files.get(normalized)!;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(contents));
        controller.close();
      },
    });

    return await Promise.resolve({ Contents: stream, Path: normalized });
  }

  override async HasFile(path: string): Promise<boolean> {
    return !!(await this.GetFileInfo(path));
  }

  async WriteFile(
    path: string,
    contents: ReadableStream,
    _ttlSeconds?: number,
    _headers?: Headers,
    _maxChunkSize?: number,
  ) {
    const text = await new Response(contents).text();
    this.files.set(path.replace(/\\/g, "/"), text);
  }

  override ResolvePath(...parts: string[]): string {
    return [".", ...parts].join("/").replace(/\\/g, "/");
  }

  async RemoveFile(path: string): Promise<void> {
    this.files.delete(path.replace(/\\/g, "/"));
    await Promise.resolve();
  }
}

class MapTemplateLocator implements TemplateLocator {
  constructor(private templates: Map<string, string>) {}

  async ListFiles(templatePath: string): Promise<string[]> {
    return await Promise.resolve(
      Array.from(this.templates.keys()).filter((p) =>
        p.startsWith(`${templatePath.replace(/\\/g, "/")}/`)
      ),
    );
  }

  async ReadTemplateFile(path: string): Promise<string> {
    const normalized = path.replace(/\\/g, "/");
    const found = this.templates.get(normalized);
    if (!found) throw new Error(`Template not found: ${path}`);
    return await Promise.resolve(found);
  }
}

Deno.test("TemplateScaffolder strips template root when rendering", async () => {
  const templateFiles = new Map<string, string>([
    ["./templates/cli-build-static/cli.ts.hbs", 'console.log("{{msg}}");'],
    [
      "./templates/cli-build-static/nested/file.txt",
      "static file",
    ],
  ]);

  const locator = new MapTemplateLocator(templateFiles);
  const dfs = new InMemoryDFS(new Map(templateFiles));

  const scaffolder = new TemplateScaffolder(locator, dfs, { msg: "hi" });

  await scaffolder.Scaffold({
    templateName: "cli-build-static",
    outputDir: "./.build",
  });

  const files = await dfs.LoadAllPaths();
  const normalized = files.map((f) => f.replace(/\\/g, "/")).sort();
  const cleaned = normalized.map((p) => p.replace(/^\.\//, "")).sort();

  assertEquals(
    cleaned,
    [
      ".build/cli.ts",
      ".build/nested/file.txt",
      "./templates/cli-build-static/cli.ts.hbs".replace(/^\.\//, ""),
      "./templates/cli-build-static/nested/file.txt".replace(/^\.\//, ""),
    ].sort(),
  );

  const renderedCli = await dfs.GetFileInfo(".build/cli.ts");
  const cliText = await new Response(renderedCli?.Contents).text();
  assertEquals(cliText.trim(), 'console.log("hi");');

  const staticFile = await dfs.GetFileInfo(".build/nested/file.txt");
  const staticText = await new Response(staticFile?.Contents).text();
  assertEquals(staticText.trim(), "static file");
});

Deno.test("TemplateScaffolder no-ops when template missing", async () => {
  const locator = new MapTemplateLocator(new Map());
  const dfs = new InMemoryDFS();
  const scaffolder = new TemplateScaffolder(locator, dfs);

  await scaffolder.Scaffold({ templateName: "missing" });
  const files = await dfs.LoadAllPaths();
  assertEquals(files.length, 0);
});

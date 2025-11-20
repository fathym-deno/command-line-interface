import { type DFSFileHandler, join } from "../.deps.ts";
import { Handlebars } from "../../../third-party/.exports.ts";
import type { TemplateLocator } from "../templates/TemplateLocator.ts";

export interface TemplateScaffoldOptions {
  templateName: string;
  outputDir?: string;
  context?: Record<string, unknown>;
}

export class TemplateScaffolder {
  constructor(
    protected locator: TemplateLocator,
    public DFS: DFSFileHandler,
    protected baseContext: Record<string, unknown> = {},
  ) {}

  public async Scaffold(options: TemplateScaffoldOptions): Promise<void> {
    const { templateName, outputDir, context = {} } = options;

    const mergedContext = { ...this.baseContext, ...context };
    const templateRoot = `./template/${templateName}`.replace(/\\/g, "/");

    const files = await this.locator.ListFiles(`./templates/${templateName}`);

    for (const fullPath of files) {
      const normalizedFullPath = fullPath.replace(/\\/g, "/");

      const relPath = normalizedFullPath.replace(
        new RegExp(`^${templateRoot}/?`),
        "",
      );

      const targetPath = join(outputDir || ".", relPath.replace(/\.hbs$/, ""));
      const raw = await this.locator.ReadTemplateFile(fullPath);

      let rendered: string;
      if (fullPath.endsWith(".hbs")) {
        rendered = Handlebars.compile(raw)(mergedContext);
      } else {
        rendered = raw;
      }

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(rendered));
          controller.close();
        },
      });

      await this.DFS.WriteFile(targetPath, stream);
    }
  }
}

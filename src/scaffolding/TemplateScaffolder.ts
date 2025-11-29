import { type DFSFileHandler, Handlebars, join } from '../.deps.ts';
import type { TemplateLocator } from '../templates/TemplateLocator.ts';

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

    // Normalize template root - remove leading ./ and normalize slashes
    const templateRoot = `templates/${templateName}`.replace(/\\/g, '/');

    const files = await this.locator.ListFiles(`./templates/${templateName}`);

    for (const fullPath of files) {
      // Normalize the full path: forward slashes, remove leading ./
      const normalizedFullPath = fullPath
        .replace(/\\/g, '/')
        .replace(/^\.\//, '');

      // Strip the template root prefix to get the relative path
      const relPath = normalizedFullPath.startsWith(templateRoot + '/')
        ? normalizedFullPath.substring(templateRoot.length + 1)
        : normalizedFullPath.startsWith(templateRoot)
          ? normalizedFullPath.substring(templateRoot.length)
          : normalizedFullPath;

      // Skip if relPath is empty (would be the template directory itself)
      if (!relPath) continue;

      const targetPath = join(outputDir || '.', relPath.replace(/\.hbs$/, ''));
      const raw = await this.locator.ReadTemplateFile(fullPath);

      let rendered: string;
      if (fullPath.endsWith('.hbs')) {
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

import { type DFSFileHandler, Handlebars, join } from "../.deps.ts";
import type { TemplateLocator } from "../templates/TemplateLocator.ts";

/**
 * Options for scaffolding a template.
 */
export interface TemplateScaffoldOptions {
  /** Template name (directory under ./templates/) */
  templateName: string;

  /** Output directory (relative to DFS root) */
  outputDir?: string;

  /** Additional context variables (merged with baseContext) */
  context?: Record<string, unknown>;
}

/**
 * Scaffolds projects from Handlebars templates.
 *
 * The scaffolder renders `.hbs` template files through Handlebars and writes
 * the output to a target DFS handler. It supports template variables in both
 * file content and file/directory names.
 *
 * @example Basic usage
 * ```typescript
 * const scaffolder = new TemplateScaffolder(
 *   await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
 *   await dfsCtxMgr.GetExecutionDFS(),
 *   { author: 'Fathym' },  // baseContext
 * );
 *
 * await scaffolder.Scaffold({
 *   templateName: 'init',
 *   outputDir: 'my-project',
 *   context: { name: 'my-cli' },  // merged with baseContext
 * });
 * ```
 *
 * @example Context merging
 * ```typescript
 * // baseContext: { author: 'Fathym', year: 2024 }
 * // per-call context: { name: 'my-cli', year: 2025 }
 * // merged: { author: 'Fathym', year: 2025, name: 'my-cli' }
 * ```
 *
 * @see {@link TemplateLocator} - For locating template files
 * @see {@link DFSTemplateLocator} - Development filesystem locator
 * @see {@link EmbeddedTemplateLocator} - Compiled CLI locator
 */
export class TemplateScaffolder {
  /**
   * Creates a new template scaffolder.
   *
   * @param locator - Locator for reading template files
   * @param DFS - Output DFS handler for writing generated files
   * @param baseContext - Default context values merged with per-scaffold context
   */
  constructor(
    protected locator: TemplateLocator,
    public DFS: DFSFileHandler,
    protected baseContext: Record<string, unknown> = {},
  ) {}

  /**
   * Generate files from a template.
   *
   * Reads all files from the specified template, renders `.hbs` files through
   * Handlebars, and writes the results to the output DFS.
   *
   * @param options - Scaffolding options
   *
   * @example
   * ```typescript
   * await scaffolder.Scaffold({
   *   templateName: 'init',
   *   outputDir: 'my-project',
   *   context: { name: 'my-cli', description: 'My CLI tool' },
   * });
   * ```
   */
  public async Scaffold(options: TemplateScaffoldOptions): Promise<void> {
    const { templateName, outputDir, context = {} } = options;

    const mergedContext = { ...this.baseContext, ...context };

    // Normalize template root - remove leading ./ and normalize slashes
    const templateRoot = `templates/${templateName}`.replace(/\\/g, "/");

    const files = await this.locator.ListFiles(`./templates/${templateName}`);

    for (const fullPath of files) {
      // Normalize the full path: forward slashes, remove leading ./
      const normalizedFullPath = fullPath
        .replace(/\\/g, "/")
        .replace(/^\.\//, "");

      // Strip the template root prefix to get the relative path
      const relPath = normalizedFullPath.startsWith(templateRoot + "/")
        ? normalizedFullPath.substring(templateRoot.length + 1)
        : normalizedFullPath.startsWith(templateRoot)
        ? normalizedFullPath.substring(templateRoot.length)
        : normalizedFullPath;

      // Skip if relPath is empty (would be the template directory itself)
      if (!relPath) continue;

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

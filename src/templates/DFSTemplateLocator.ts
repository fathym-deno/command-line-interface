import type { DFSFileHandler } from "../.deps.ts";
import type { TemplateLocator } from "./TemplateLocator.ts";

/**
 * Template locator that reads from a Distributed File System (DFS) handler.
 *
 * This locator is typically used during development when templates are
 * stored on the local filesystem. It supports any DFS handler including
 * LocalDFSFileHandler, MemoryDFSFileHandler, and RemoteFetchDFSFileHandler.
 *
 * @example Basic usage with local filesystem
 * ```typescript
 * const dfs = new LocalDFSFileHandler({ FileRoot: './cli' });
 * const locator = new DFSTemplateLocator(dfs);
 *
 * const files = await locator.ListFiles('./templates/init');
 * const content = await locator.ReadTemplateFile(files[0]);
 * ```
 *
 * @example With memory DFS for testing
 * ```typescript
 * const dfs = new MemoryDFSFileHandler({});
 * await dfs.WriteFile('./templates/init/mod.ts.hbs', createStream('...'));
 *
 * const locator = new DFSTemplateLocator(dfs);
 * ```
 *
 * @see {@link TemplateLocator} - Abstract base class
 * @see {@link EmbeddedTemplateLocator} - For compiled CLIs
 * @see {@link TemplateScaffolder} - Uses locator for project generation
 */
export class DFSTemplateLocator implements TemplateLocator {
  /**
   * Creates a new DFS-based template locator.
   *
   * @param dfs - The DFS handler to read templates from
   */
  constructor(
    protected dfs: DFSFileHandler,
  ) {}

  /**
   * List all files within a template directory.
   *
   * Uses `LoadAllPaths()` on the DFS handler and filters by prefix.
   *
   * @param templatePath - Path to the template directory
   * @returns Array of file paths matching the template prefix
   */
  async ListFiles(templatePath: string): Promise<string[]> {
    const allPaths = await this.dfs.LoadAllPaths();
    const prefix = `${templatePath}/`;

    return allPaths.filter((p) => p.startsWith(prefix));
  }

  /**
   * Read a template file's contents.
   *
   * @param path - Path to the template file
   * @returns File contents as a string
   * @throws Error if the template file is not found in DFS
   */
  async ReadTemplateFile(path: string): Promise<string> {
    const fileInfo = await this.dfs.GetFileInfo(path);
    if (!fileInfo) throw new Error(`Template not found in DFS: ${path}`);

    return await new Response(fileInfo.Contents).text();
  }
}

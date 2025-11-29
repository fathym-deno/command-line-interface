/**
 * Abstract base class for template file location strategies.
 *
 * Template locators provide a unified interface for discovering and reading
 * template files from various sources (filesystem, embedded bundles, remote).
 *
 * @example DFS-based locator (development)
 * ```typescript
 * const locator = new DFSTemplateLocator(
 *   new LocalDFSFileHandler({ FileRoot: './cli' }),
 * );
 *
 * const files = await locator.ListFiles('./templates/init');
 * const content = await locator.ReadTemplateFile('./templates/init/deno.jsonc.hbs');
 * ```
 *
 * @example Embedded locator (compiled CLI)
 * ```typescript
 * import templates from './.build/embedded-templates.json' with { type: 'json' };
 *
 * const locator = new EmbeddedTemplateLocator(templates);
 * ```
 *
 * @see {@link DFSTemplateLocator} - Filesystem-based locator
 * @see {@link EmbeddedTemplateLocator} - In-memory embedded locator
 * @see {@link TemplateScaffolder} - Uses locator to generate projects
 */
export abstract class TemplateLocator {
  /**
   * List all files in a template directory.
   *
   * @param templateName - Template directory path (e.g., './templates/init')
   * @returns Array of file paths relative to the template root
   *
   * @example
   * ```typescript
   * const files = await locator.ListFiles('./templates/init');
   * // ['./templates/init/{{name}}/deno.jsonc.hbs', ...]
   * ```
   */
  abstract ListFiles(templateName: string): Promise<string[]>;

  /**
   * Read the contents of a template file.
   *
   * @param path - Full path to the template file
   * @returns The file contents as a string
   * @throws Error if the file is not found
   *
   * @example
   * ```typescript
   * const content = await locator.ReadTemplateFile(
   *   './templates/init/{{name}}/deno.jsonc.hbs'
   * );
   * ```
   */
  abstract ReadTemplateFile(path: string): Promise<string>;
}

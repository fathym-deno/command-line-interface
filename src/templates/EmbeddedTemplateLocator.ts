import type { TemplateLocator } from './TemplateLocator.ts';

/**
 * TemplateLocator implementation that reads from a preloaded in-memory map.
 * Typically used in statically compiled CLI binaries.
 */
export class EmbeddedTemplateLocator implements TemplateLocator {
  constructor(protected templates: Record<string, string>) {}

  public ListFiles(templateName: string): Promise<string[]> {
    const normalized = templateName
      .replace(/^.*[\\/]templates[\\/]/, '') // Strip any full path prefix
      .replace(/^\.\/templates\//, '') // Strip leading ./templates/
      .replace(/^templates\//, ''); // Strip leading templates/

    const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`;

    const matchingKeys = Object.keys(this.templates)
      .filter((key) => key.startsWith(prefix) && !key.endsWith('/'))
      .map((key) => `./templates/${key}`);

    return Promise.resolve(matchingKeys);
  }

  public ReadTemplateFile(path: string): Promise<string> {
    const normalized = path
      .replace(/^\.\/templates\//, '') // Strip ./templates/
      .replace(/^templates\//, ''); // Strip templates/

    const contents = this.templates[normalized];

    if (contents === undefined) {
      throw new Error(`Template not found: ${path}`);
    }

    return Promise.resolve(contents);
  }
}

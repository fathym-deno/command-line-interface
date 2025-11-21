import type { DFSFileHandler } from '../.deps.ts';
import type { TemplateLocator } from './TemplateLocator.ts';

export class DFSTemplateLocator implements TemplateLocator {
  constructor(
    protected dfs: DFSFileHandler,
  ) {}

  async ListFiles(templatePath: string): Promise<string[]> {
    const allPaths = await this.dfs.LoadAllPaths();
    const prefix = `${templatePath}/`;

    return allPaths.filter((p) => p.startsWith(prefix));
  }

  async ReadTemplateFile(path: string): Promise<string> {
    const fileInfo = await this.dfs.GetFileInfo(path);
    if (!fileInfo) throw new Error(`Template not found in DFS: ${path}`);

    return await new Response(fileInfo.Contents).text();
  }
}

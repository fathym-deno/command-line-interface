export abstract class TemplateLocator {
  abstract ListFiles(templateName: string): Promise<string[]>;
  abstract ReadTemplateFile(path: string): Promise<string>;
}

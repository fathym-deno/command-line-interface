// import { join, relative, walk } from "../.deps.ts";
// import type { TemplateLocator } from "./TemplateLocator.ts";

// export class FileSystemTemplateLocator implements TemplateLocator {
//   constructor(protected baseDir: string) {}

//   async ListFiles(templateName: string): Promise<string[]> {
//     const results: string[] = [];
//     const from = join(this.baseDir, templateName);

//     for await (const entry of walk(from, { includeDirs: false })) {
//       const rel = relative(from, entry.path);
//       results.push(join(templateName, rel));
//     }

//     return results;
//   }

//   async ReadTemplateFile(path: string): Promise<string> {
//     return await Deno.readTextFile(join(this.baseDir, path));
//   }
// }

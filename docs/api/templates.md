---
FrontmatterVersion: 1
DocumentType: API
Title: Templates API Reference
Summary: API reference for TemplateScaffolder, TemplateLocator, and template systems.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Scaffolding Guide
    Path: ../guides/scaffolding.md
---

# Templates API Reference

API reference for the template scaffolding system including `TemplateScaffolder`, `TemplateLocator`, and related classes.

## TemplateScaffolder

The main class for scaffolding projects from Handlebars templates.

```typescript
import { TemplateScaffolder } from '@fathym/cli';
```

### Constructor

```typescript
constructor(
  locator: TemplateLocator,
  outputDfs: DFSFileHandler<unknown>,
  baseContext?: Record<string, unknown>,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `locator` | `TemplateLocator` | Template file locator |
| `outputDfs` | `DFSFileHandler` | DFS handler for output (exposed as `.DFS`) |
| `baseContext` | `Record<string, unknown>?` | Default Handlebars context (merged with per-call context) |

```typescript
const scaffolder = new TemplateScaffolder(
  await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
  await dfsCtxMgr.GetExecutionDFS(),
  { author: 'Fathym Platform', year: new Date().getFullYear() },
);
```

### Properties

#### DFS

```typescript
public DFS: DFSFileHandler
```

The output DFS handler passed to the constructor. Useful for additional file operations.

```typescript
// Check if file exists before scaffolding
const existing = await scaffolder.DFS.GetFileInfo('my-project/deno.json');
if (existing) {
  Log.Warn('Project already exists');
  return;
}
```

---

### Methods

#### Scaffold

```typescript
async Scaffold(options: TemplateScaffoldOptions): Promise<void>
```

Generate files from a template.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `TemplateScaffoldOptions` | Scaffolding options |

```typescript
interface TemplateScaffoldOptions {
  /** Template name (directory under ./templates/) */
  templateName: string;

  /** Output directory (relative to outputDfs) */
  outputDir?: string;

  /** Additional context (merged with baseContext) */
  context?: Record<string, unknown>;
}
```

The `context` is merged with `baseContext` from the constructor, with per-call values
taking precedence:

```typescript
// Constructor baseContext: { author: 'Fathym', year: 2024 }
await scaffolder.Scaffold({
  templateName: 'init',
  outputDir: 'my-project',
  context: { name: 'my-cli', year: 2025 },  // year overrides baseContext
});
// Merged context: { author: 'Fathym', year: 2025, name: 'my-cli' }
```

---

## TemplateLocator

Abstract base class for template file location strategies.

```typescript
import { TemplateLocator } from '@fathym/cli';
```

### Abstract Methods

#### ListFiles

```typescript
abstract ListFiles(templateName: string): Promise<string[]>
```

List all files in a template directory.

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateName` | `string` | Template directory path (e.g., `'./templates/init'`) |

**Returns:** Array of file paths relative to template root

```typescript
const files = await locator.ListFiles('./templates/init');
// ['./templates/init/{{name}}/deno.jsonc.hbs', './templates/init/{{name}}/README.md.hbs']
```

#### ReadTemplateFile

```typescript
abstract ReadTemplateFile(path: string): Promise<string>
```

Read the contents of a template file.

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Full path to the template file |

**Returns:** The file contents as a string

**Throws:** Error if the file is not found

```typescript
const content = await locator.ReadTemplateFile('./templates/init/{{name}}/deno.jsonc.hbs');
```

---

## DFSTemplateLocator

Locates templates from a DFS handler (filesystem). Used during development when
templates are stored on the local filesystem.

```typescript
import { DFSTemplateLocator } from '@fathym/cli';
```

### Constructor

```typescript
constructor(dfs: DFSFileHandler)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dfs` | `DFSFileHandler` | DFS handler rooted at the CLI project directory |

```typescript
const locator = new DFSTemplateLocator(
  new LocalDFSFileHandler({ FileRoot: './cli' }),
);
```

### Usage Example

```typescript
// Directory structure:
// cli/
//   templates/
//     init/
//       {{name}}/
//         deno.jsonc.hbs
//         README.md.hbs

const dfs = new LocalDFSFileHandler({ FileRoot: './cli' });
const locator = new DFSTemplateLocator(dfs);

const files = await locator.ListFiles('./templates/init');
// ['./templates/init/{{name}}/deno.jsonc.hbs', ...]

const content = await locator.ReadTemplateFile('./templates/init/{{name}}/deno.jsonc.hbs');
```

### With Memory DFS (Testing)

```typescript
import { MemoryDFSFileHandler } from '@fathym/dfs/handlers';

const dfs = new MemoryDFSFileHandler({});
await dfs.WriteFile('./templates/init/mod.ts.hbs', createStream('export default {};'));

const locator = new DFSTemplateLocator(dfs);
```

---

## EmbeddedTemplateLocator

Locates templates from a preloaded in-memory map. Used in statically compiled
CLI binaries where templates are bundled at build time.

```typescript
import { EmbeddedTemplateLocator } from '@fathym/cli';
```

### Constructor

```typescript
constructor(templates: Record<string, string>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `templates` | `Record<string, string>` | Map of template paths to content |

```typescript
// Keys are paths without leading ./templates/, values are file content
const templates = {
  'init/{{name}}/deno.jsonc.hbs': '{\n  "name": "{{name}}"\n}',
  'init/{{name}}/README.md.hbs': '# {{name}}\n',
};
```

### Usage Example

```typescript
import embeddedTemplates from './.build/embedded-templates.json' with { type: 'json' };

const locator = new EmbeddedTemplateLocator(embeddedTemplates);

// ListFiles returns paths prefixed with ./templates/
const files = await locator.ListFiles('init');
// ['./templates/init/{{name}}/deno.jsonc.hbs', ...]

// ReadTemplateFile accepts paths with or without ./templates/ prefix
const content = await locator.ReadTemplateFile('./templates/init/{{name}}/deno.jsonc.hbs');
```

### Building Embedded Templates

Templates are embedded during the CLI build process:

```bash
deno task build
```

This creates `.build/embedded-templates.json` containing all template files.
See [Compiling CLIs Guide](../guides/embedded-cli.md) for details.

---

## Template Syntax

Templates use Handlebars syntax for dynamic content.

### Variables

```handlebars
{{! deno.jsonc.hbs }}
{
  "name": "{{name}}",
  "version": "{{version}}",
  "author": "{{author}}"
}
```

### Conditionals

```handlebars
{{#if description}}
## Description

{{description}}
{{/if}}
```

### Loops

```handlebars
{{#each dependencies}}
- {{this}}
{{/each}}
```

### Built-in Helpers

| Helper | Description |
|--------|-------------|
| `{{#if}}` | Conditional block |
| `{{#unless}}` | Inverse conditional |
| `{{#each}}` | Iteration |
| `{{#with}}` | Context switching |

### Custom Helpers

Register custom helpers via the scaffolder:

```typescript
import Handlebars from 'handlebars';

Handlebars.registerHelper('uppercase', (str) => str.toUpperCase());
Handlebars.registerHelper('lowercase', (str) => str.toLowerCase());
Handlebars.registerHelper('kebabCase', (str) => toKebabCase(str));
Handlebars.registerHelper('pascalCase', (str) => toPascalCase(str));
```

---

## File Naming

Template files can use Handlebars in filenames:

```
templates/init/
  {{name}}/           # Directory named after project
    deno.jsonc.hbs    # Rendered and stripped of .hbs
    README.md.hbs
    src/
      mod.ts.hbs
```

### Output

With context `{ name: 'my-cli' }`:

```
my-cli/
  deno.jsonc
  README.md
  src/
    mod.ts
```

---

## Usage in Commands

### Basic Template Command

```typescript
import { Command, CLIDFSContextManager, TemplateLocator, TemplateScaffolder } from '@fathym/cli';

export default Command('init', 'Initialize a new project')
  .Args(z.tuple([z.string().optional()]))
  .Services(async (ctx, ioc) => {
    const dfsCtxMgr = await ioc.Resolve(CLIDFSContextManager);

    return {
      scaffolder: new TemplateScaffolder(
        await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
        await dfsCtxMgr.GetExecutionDFS(),
        { name: ctx.Params.Arg(0) ?? 'my-project' },
      ),
    };
  })
  .Run(async ({ Params, Services, Log }) => {
    await Services.scaffolder.Scaffold({
      templateName: 'init',
      outputDir: Params.Arg(0) ?? '.',
    });

    Log.Success('Project initialized!');
  });
```

### With Template Selection

```typescript
export default Command('generate', 'Generate from template')
  .Args(z.tuple([z.string().describe('Template name')]))
  .Flags(z.object({
    name: z.string().describe('Output name'),
  }))
  .Services(async (ctx, ioc) => ({
    scaffolder: new TemplateScaffolder(
      await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
      await dfsCtxMgr.GetExecutionDFS(),
      { name: ctx.Params.Flag('name') },
    ),
  }))
  .Run(async ({ Params, Services, Log }) => {
    const template = Params.Arg(0);
    const name = Params.Flag('name');

    await Services.scaffolder.Scaffold({
      templateName: template,
      outputDir: name,
    });

    Log.Success(`Generated ${name} from ${template} template`);
  });
```

---

## IoC Registration

Register the template locator in `.cli.json`:

```json
{
  "ioc": {
    "TemplateLocator": {
      "Type": "Singleton",
      "Factory": "./services/createTemplateLocator.ts"
    }
  }
}
```

Factory file:

```typescript
// services/createTemplateLocator.ts
import { DFSTemplateLocator, TemplateLocator } from '@fathym/cli';
import { LocalDFSFileHandler } from '@fathym/dfs/handlers';

export function createTemplateLocator(): TemplateLocator {
  const dfs = new LocalDFSFileHandler({
    FileRoot: import.meta.resolve('../'),
  });

  return new DFSTemplateLocator(dfs);
}
```

---

## Related

- [Scaffolding Guide](../guides/scaffolding.md) - Template creation
- [Embedded CLI Guide](../guides/embedded-cli.md) - Compiling with templates
- [Commands API](./commands.md) - Command runtime

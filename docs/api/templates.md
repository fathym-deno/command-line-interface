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
  context: Record<string, unknown>,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `locator` | `TemplateLocator` | Template file locator |
| `outputDfs` | `DFSFileHandler` | DFS handler for output |
| `context` | `Record<string, unknown>` | Handlebars template context |

```typescript
const scaffolder = new TemplateScaffolder(
  await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
  await dfsCtxMgr.GetExecutionDFS(),
  { name: 'my-project', author: 'John' },
);
```

---

### Methods

#### Scaffold

```typescript
async Scaffold(options: ScaffoldOptions): Promise<void>
```

Generate files from a template.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `ScaffoldOptions` | Scaffolding options |

```typescript
interface ScaffoldOptions {
  /** Template name to use */
  templateName: string;

  /** Output directory (relative to outputDfs) */
  outputDir: string;

  /** Additional context overrides */
  context?: Record<string, unknown>;

  /** Skip confirmation prompts */
  force?: boolean;
}
```

```typescript
await scaffolder.Scaffold({
  templateName: 'init',
  outputDir: 'my-project',
  context: { description: 'My new project' },
});
```

#### ListTemplates

```typescript
async ListTemplates(): Promise<string[]>
```

Get available template names.

**Returns:** Array of template names

```typescript
const templates = await scaffolder.ListTemplates();
// ['init', 'component', 'service']
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

List all files in a template.

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateName` | `string` | Name of the template |

**Returns:** Array of file paths relative to template root

#### GetFile

```typescript
abstract GetFile(filePath: string): Promise<DFSFileInfo | undefined>
```

Get a specific template file.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Path to the file |

**Returns:** File info with contents stream, or undefined

#### ListTemplates

```typescript
abstract ListTemplates(): Promise<string[]>
```

List available template names.

**Returns:** Array of template names

---

## DFSTemplateLocator

Locates templates from a DFS handler (filesystem).

```typescript
import { DFSTemplateLocator } from '@fathym/cli';
```

### Constructor

```typescript
constructor(
  dfs: DFSFileHandler<unknown>,
  templatesPath?: string,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dfs` | `DFSFileHandler` | DFS handler for template files |
| `templatesPath` | `string?` | Base path for templates (default: 'templates') |

```typescript
const locator = new DFSTemplateLocator(
  new LocalDFSFileHandler({ FileRoot: './cli' }),
  'templates',
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

const locator = new DFSTemplateLocator(cliDfs, 'templates');
const files = await locator.ListFiles('init');
// ['./templates/init/{{name}}/deno.jsonc.hbs', ...]
```

---

## EmbeddedTemplateLocator

Locates templates from a compiled JSON bundle.

```typescript
import { EmbeddedTemplateLocator } from '@fathym/cli';
```

### Constructor

```typescript
constructor(templates: EmbeddedTemplates)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `templates` | `EmbeddedTemplates` | Embedded template bundle |

```typescript
interface EmbeddedTemplates {
  [path: string]: string;  // path -> base64 encoded content
}
```

### Usage Example

```typescript
import embeddedTemplates from './.build/embedded-templates.json' with { type: 'json' };

const locator = new EmbeddedTemplateLocator(embeddedTemplates);
```

### Building Embedded Templates

Templates are embedded during the build process:

```bash
deno task ftm-cli:build
```

This creates `.build/embedded-templates.json` containing base64-encoded template files.

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
import { DFSTemplateLocator } from '@fathym/cli';
import { LocalDFSFileHandler } from '@fathym/dfs/handlers';

export function createTemplateLocator(): TemplateLocator {
  const dfs = new LocalDFSFileHandler({
    FileRoot: import.meta.resolve('../'),
  });

  return new DFSTemplateLocator(dfs, 'templates');
}
```

---

## Related

- [Scaffolding Guide](../guides/scaffolding.md) - Template creation
- [Embedded CLI Guide](../guides/embedded-cli.md) - Compiling with templates
- [Commands API](./commands.md) - Command runtime

---
FrontmatterVersion: 1
DocumentType: Guide
Title: Template Scaffolding
Summary: Create and use templates for project generation.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Templates API
    Path: ../api/templates.md
---

# Template Scaffolding

This guide covers creating and using templates for project scaffolding with the CLI framework.

## Overview

The scaffolding system lets you generate projects from Handlebars templates. It supports:
- Dynamic file content with Handlebars syntax
- Dynamic file and directory names
- Multiple template sources (filesystem, embedded)
- Custom template helpers

---

## Creating Templates

### Directory Structure

Templates live in a `templates/` directory:

```
my-cli/
├── templates/
│   ├── init/                    # Template name
│   │   ├── {{name}}/            # Dynamic directory
│   │   │   ├── deno.jsonc.hbs   # Template file
│   │   │   ├── README.md.hbs
│   │   │   └── src/
│   │   │       └── mod.ts.hbs
│   ├── component/               # Another template
│   │   └── ...
│   └── service/
│       └── ...
├── .cli.json
└── commands/
```

### Template File Syntax

Use Handlebars syntax for dynamic content:

```handlebars
{{! templates/init/{{name}}/deno.jsonc.hbs }}
{
  "name": "{{name}}",
  "version": "{{version}}",
  "exports": {
    ".": "./src/mod.ts"
  },
  "tasks": {
    "build": "deno fmt && deno lint && deno test -A ./tests"
  }
}
```

```handlebars
{{! templates/init/{{name}}/README.md.hbs }}
# {{name}}

{{#if description}}
{{description}}
{{/if}}

## Getting Started

```bash
deno task build
```

## License

MIT
```

```handlebars
{{! templates/init/{{name}}/src/mod.ts.hbs }}
/**
 * {{name}} - Main module
 * @module
 */

export function hello(name: string = 'World'): string {
  return `Hello, ${name}!`;
}
```

---

## Handlebars Syntax

### Variables

```handlebars
{{name}}           {{! Simple variable }}
{{project.name}}   {{! Nested property }}
{{{raw}}}          {{! No HTML escaping }}
```

### Conditionals

```handlebars
{{#if description}}
## Description

{{description}}
{{/if}}

{{#unless minimal}}
## Full Documentation

...detailed docs...
{{/unless}}
```

### Loops

```handlebars
{{#each dependencies}}
- {{this}}
{{/each}}

{{#each scripts}}
"{{@key}}": "{{this}}"{{#unless @last}},{{/unless}}
{{/each}}
```

### Built-in Helpers

```handlebars
{{#if value}}...{{/if}}
{{#unless value}}...{{/unless}}
{{#each array}}...{{/each}}
{{#with object}}...{{/with}}
{{lookup object key}}
{{log "Debug message"}}
```

---

## Dynamic File Names

Use Handlebars in file and directory names:

```
templates/component/
├── {{name}}.tsx.hbs           # -> MyComponent.tsx
├── {{name}}.test.ts.hbs       # -> MyComponent.test.ts
├── {{kebabCase name}}/        # -> my-component/
│   └── styles.css.hbs
```

### Case Transformations

Register custom helpers for case transformations:

```typescript
import Handlebars from 'handlebars';
import { kebabCase, pascalCase, camelCase } from '@luca/cases';

Handlebars.registerHelper('kebabCase', kebabCase);
Handlebars.registerHelper('pascalCase', pascalCase);
Handlebars.registerHelper('camelCase', camelCase);
```

Usage in templates:

```handlebars
export class {{pascalCase name}}Component {
  private {{camelCase name}}Id: string;
}
```

---

## Using Templates in Commands

### Basic Scaffold Command

```typescript
import { Command, CLIDFSContextManager, TemplateLocator, TemplateScaffolder } from '@fathym/cli';
import { z } from 'zod';

export default Command('init', 'Initialize a new project')
  .Args(z.tuple([
    z.string().optional().describe('Project name'),
  ]))
  .Flags(z.object({
    template: z.string().optional().describe('Template to use'),
  }))
  .Services(async (ctx, ioc) => {
    const dfsCtxMgr = await ioc.Resolve(CLIDFSContextManager);

    return {
      buildDfs: await dfsCtxMgr.GetExecutionDFS(),
      scaffolder: new TemplateScaffolder(
        await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
        await dfsCtxMgr.GetExecutionDFS(),
        { name: ctx.Params.Arg(0) ?? 'my-project' },
      ),
    };
  })
  .Run(async ({ Params, Services, Log }) => {
    const name = Params.Arg(0) ?? 'my-project';
    const template = Params.Flag('template') ?? 'init';

    await Services.scaffolder.Scaffold({
      templateName: template,
      outputDir: name,
    });

    const fullPath = await Services.buildDfs.ResolvePath(name);
    Log.Success(`Project created from "${template}" template.`);
    Log.Info(`Initialized at: ${fullPath}`);
  });
```

### Scaffold with Additional Context

```typescript
.Services(async (ctx, ioc) => {
  const dfsCtxMgr = await ioc.Resolve(CLIDFSContextManager);

  return {
    scaffolder: new TemplateScaffolder(
      await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
      await dfsCtxMgr.GetExecutionDFS(),
      {
        // Template context variables
        name: ctx.Params.Arg(0),
        version: '0.0.1',
        description: ctx.Params.Flag('description'),
        author: ctx.Params.Flag('author'),
        license: ctx.Params.Flag('license') ?? 'MIT',
        year: new Date().getFullYear(),
      },
    ),
  };
})
```

### List Available Templates

```typescript
Command('templates', 'List available templates')
  .Services(async (ctx, ioc) => ({
    scaffolder: new TemplateScaffolder(
      await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
      await dfsCtxMgr.GetExecutionDFS(),
      {},
    ),
  }))
  .Run(async ({ Services, Log }) => {
    const templates = await Services.scaffolder.ListTemplates();

    Log.Info('Available templates:');
    templates.forEach(t => Log.Info(`  - ${t}`));
  });
```

---

## Template Locators

### DFSTemplateLocator

For development, load templates from the filesystem:

```typescript
import { DFSTemplateLocator } from '@fathym/cli';
import { LocalDFSFileHandler } from '@fathym/dfs/handlers';

const dfs = new LocalDFSFileHandler({
  FileRoot: import.meta.resolve('../'),
});

const locator = new DFSTemplateLocator(dfs, 'templates');
```

### EmbeddedTemplateLocator

For compiled CLIs, load templates from an embedded JSON bundle:

```typescript
import { EmbeddedTemplateLocator } from '@fathym/cli';
import templates from './.build/embedded-templates.json' with { type: 'json' };

const locator = new EmbeddedTemplateLocator(templates);
```

### IoC Registration

Configure in `.cli.json`:

```json
{
  "ioc": {
    "TemplateLocator": {
      "Type": "Singleton",
      "Factory": "./services/createTemplateLocator.ts"
    }
  },
  "templates": "./templates"
}
```

Factory:

```typescript
// services/createTemplateLocator.ts
import { DFSTemplateLocator, EmbeddedTemplateLocator } from '@fathym/cli';
import { LocalDFSFileHandler } from '@fathym/dfs/handlers';

export async function createTemplateLocator(): Promise<TemplateLocator> {
  // Try embedded first (for compiled CLI)
  try {
    const templates = await import('./.build/embedded-templates.json', {
      with: { type: 'json' },
    });
    return new EmbeddedTemplateLocator(templates.default);
  } catch {
    // Fall back to filesystem
    const dfs = new LocalDFSFileHandler({
      FileRoot: import.meta.resolve('../'),
    });
    return new DFSTemplateLocator(dfs, 'templates');
  }
}
```

---

## Template Examples

### CLI Project Template

```
templates/init/
├── {{name}}/
│   ├── .cli.json.hbs
│   ├── deno.jsonc.hbs
│   ├── README.md.hbs
│   ├── commands/
│   │   └── hello.ts.hbs
│   ├── tests/
│   │   ├── .tests.ts.hbs
│   │   └── intents/
│   │       └── hello.intents.ts.hbs
│   └── main.ts.hbs
```

### Component Template

```
templates/component/
├── {{name}}.tsx.hbs
├── {{name}}.test.tsx.hbs
├── {{name}}.css.hbs
└── index.ts.hbs
```

### Service Template

```
templates/service/
├── {{name}}Service.ts.hbs
├── {{name}}Service.test.ts.hbs
├── I{{name}}Service.ts.hbs
└── index.ts.hbs
```

---

## Building Embedded Templates

For compiled/distributed CLIs, embed templates into a JSON file:

### Build Script

```typescript
// scripts/embed-templates.ts
import { walk } from '@std/fs';
import { relative } from '@std/path';

const templates: Record<string, string> = {};
const templatesDir = './templates';

for await (const entry of walk(templatesDir)) {
  if (entry.isFile) {
    const relativePath = relative(templatesDir, entry.path);
    const content = await Deno.readTextFile(entry.path);
    templates[relativePath] = btoa(content);  // Base64 encode
  }
}

await Deno.writeTextFile(
  './.build/embedded-templates.json',
  JSON.stringify(templates, null, 2),
);
```

### Deno Task

```json
{
  "tasks": {
    "build:templates": "deno run -A ./scripts/embed-templates.ts",
    "build": "deno task build:templates && deno compile ..."
  }
}
```

---

## Related

- [Templates API Reference](../api/templates.md) - Full API
- [Compiling CLIs](./embedded-cli.md) - Distribution
- [Getting Started](./getting-started.md) - Quick start

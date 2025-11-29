---
FrontmatterVersion: 1
DocumentType: Guide
Title: Compiling CLIs
Summary: Create standalone executables for CLI distribution.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Scaffolding Guide
    Path: ./scaffolding.md
---

# Compiling CLIs

This guide covers compiling your CLI into standalone executables for distribution.

## Overview

The CLI framework supports compiling to standalone executables using `deno compile`. This involves:

1. Embedding templates into a JSON bundle
2. Configuring the template locator for embedded mode
3. Compiling with Deno

---

## Project Structure

```
my-cli/
├── .build/                      # Build output
│   └── embedded-templates.json  # Embedded templates
├── commands/
│   ├── init.ts
│   └── greet.ts
├── templates/
│   └── init/
│       └── ...
├── scripts/
│   └── cli-runtime.ts          # CLI runtime script
├── .cli.json
├── deno.json
└── main.ts
```

---

## Step 1: Create CLI Runtime Script

Create `scripts/cli-runtime.ts`:

```typescript
import { CLI } from '@fathym/cli';

// Import embedded templates (if available)
let embeddedTemplates: Record<string, string> | undefined;
try {
  const mod = await import('../.build/embedded-templates.json', {
    with: { type: 'json' },
  });
  embeddedTemplates = mod.default;
} catch {
  // Templates not embedded - using filesystem
}

const cli = new CLI({
  name: 'my-cli',
  version: '1.0.0',
  config: import.meta.resolve('../.cli.json'),
  embeddedTemplates,
});

if (import.meta.main) {
  const exitCode = await cli.Run(Deno.args);
  Deno.exit(exitCode);
}
```

---

## Step 2: Embed Templates

Create a script to embed templates:

```typescript
// scripts/embed-templates.ts
import { walk } from '@std/fs';
import { relative, join } from '@std/path';
import { ensureDir } from '@std/fs';

const templatesDir = './templates';
const outputPath = './.build/embedded-templates.json';

await ensureDir('./.build');

const templates: Record<string, string> = {};

for await (const entry of walk(templatesDir)) {
  if (entry.isFile) {
    const relativePath = relative(templatesDir, entry.path)
      .replace(/\\/g, '/');  // Normalize for Windows
    const content = await Deno.readTextFile(entry.path);
    templates[relativePath] = btoa(content);
  }
}

await Deno.writeTextFile(outputPath, JSON.stringify(templates, null, 2));

console.log(`Embedded ${Object.keys(templates).length} template files`);
```

---

## Step 3: Configure Deno Tasks

Update `deno.json`:

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "tasks": {
    "build": "deno fmt && deno lint && deno test -A ./tests",
    "build:templates": "deno run -A ./scripts/embed-templates.ts",
    "compile": "deno task build:templates && deno compile -A --output=./dist/my-cli ./scripts/cli-runtime.ts",
    "compile:all": "deno task compile:linux && deno task compile:macos && deno task compile:windows",
    "compile:linux": "deno task build:templates && deno compile -A --target=x86_64-unknown-linux-gnu --output=./dist/my-cli-linux ./scripts/cli-runtime.ts",
    "compile:macos": "deno task build:templates && deno compile -A --target=x86_64-apple-darwin --output=./dist/my-cli-macos ./scripts/cli-runtime.ts",
    "compile:windows": "deno task build:templates && deno compile -A --target=x86_64-pc-windows-msvc --output=./dist/my-cli.exe ./scripts/cli-runtime.ts"
  }
}
```

---

## Step 4: Configure Template Locator

Update your template locator to support both modes:

```typescript
// services/createTemplateLocator.ts
import {
  DFSTemplateLocator,
  EmbeddedTemplateLocator,
  TemplateLocator,
} from '@fathym/cli';
import { LocalDFSFileHandler } from '@fathym/dfs/handlers';

export async function createTemplateLocator(
  embeddedTemplates?: Record<string, string>
): Promise<TemplateLocator> {
  // Use embedded templates if available (compiled mode)
  if (embeddedTemplates && Object.keys(embeddedTemplates).length > 0) {
    return new EmbeddedTemplateLocator(embeddedTemplates);
  }

  // Fall back to filesystem (development mode)
  const dfs = new LocalDFSFileHandler({
    FileRoot: new URL('../', import.meta.url).pathname,
  });

  return new DFSTemplateLocator(dfs, 'templates');
}
```

---

## Step 5: Compile

```bash
# Compile for current platform
deno task compile

# Compile for all platforms
deno task compile:all

# The output will be in ./dist/
```

---

## Build Configuration

### Compile Options

| Option | Description |
|--------|-------------|
| `-A` | Allow all permissions |
| `--output` | Output path for executable |
| `--target` | Cross-compile target |
| `--include` | Include additional files |

### Cross-Compilation Targets

| Target | Description |
|--------|-------------|
| `x86_64-unknown-linux-gnu` | Linux x64 |
| `aarch64-unknown-linux-gnu` | Linux ARM64 |
| `x86_64-apple-darwin` | macOS x64 |
| `aarch64-apple-darwin` | macOS ARM64 (Apple Silicon) |
| `x86_64-pc-windows-msvc` | Windows x64 |

---

## Full Build Script

For complex builds, create a comprehensive build script:

```typescript
// scripts/build.ts
import { ensureDir } from '@std/fs';

async function run(cmd: string[]): Promise<void> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const { code } = await process.output();
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd.join(' ')}`);
  }
}

async function build() {
  console.log('Building CLI...\n');

  // 1. Clean
  console.log('Cleaning previous build...');
  try {
    await Deno.remove('./.build', { recursive: true });
    await Deno.remove('./dist', { recursive: true });
  } catch { /* directories may not exist */ }

  await ensureDir('./.build');
  await ensureDir('./dist');

  // 2. Format and lint
  console.log('\nFormatting and linting...');
  await run(['deno', 'fmt']);
  await run(['deno', 'lint']);

  // 3. Run tests
  console.log('\nRunning tests...');
  await run(['deno', 'test', '-A', './tests/.tests.ts']);

  // 4. Embed templates
  console.log('\nEmbedding templates...');
  await run(['deno', 'run', '-A', './scripts/embed-templates.ts']);

  // 5. Compile
  console.log('\nCompiling...');
  const targets = [
    { name: 'linux-x64', target: 'x86_64-unknown-linux-gnu', ext: '' },
    { name: 'macos-x64', target: 'x86_64-apple-darwin', ext: '' },
    { name: 'macos-arm64', target: 'aarch64-apple-darwin', ext: '' },
    { name: 'windows-x64', target: 'x86_64-pc-windows-msvc', ext: '.exe' },
  ];

  for (const { name, target, ext } of targets) {
    console.log(`  Compiling for ${name}...`);
    await run([
      'deno', 'compile',
      '-A',
      `--target=${target}`,
      `--output=./dist/my-cli-${name}${ext}`,
      './scripts/cli-runtime.ts',
    ]);
  }

  console.log('\nBuild complete!');
  console.log('Output in ./dist/');
}

if (import.meta.main) {
  await build();
}
```

Add to `deno.json`:

```json
{
  "tasks": {
    "release": "deno run -A ./scripts/build.ts"
  }
}
```

---

## Distribution

### Manual Distribution

1. Run `deno task release`
2. Upload executables from `./dist/` to your release platform

### GitHub Releases

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Build
        run: deno task release

      - name: Upload Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
```

---

## Troubleshooting

### Template Not Found

If templates aren't working in compiled mode:

1. Check `.build/embedded-templates.json` exists
2. Verify template paths are normalized (forward slashes)
3. Ensure import includes `with { type: 'json' }`

### Permission Errors

If the compiled CLI has permission errors:

1. Compile with `-A` for all permissions, or
2. Use specific permissions: `--allow-read --allow-write --allow-env`

### Large Binary Size

To reduce binary size:

1. Ensure only necessary dependencies are imported
2. Consider lazy loading for optional features
3. Use `--lite` flag if available

---

## Related

- [Template Scaffolding](./scaffolding.md) - Creating templates
- [Getting Started](./getting-started.md) - Basic setup
- [CLI API Reference](../api/cli.md) - CLI class

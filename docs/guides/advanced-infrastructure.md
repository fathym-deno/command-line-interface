---
FrontmatterVersion: 1
DocumentType: Guide
Title: Advanced Infrastructure Guide
Summary: Deep dive into CLI infrastructure including hooks, resolver, registry, and matcher.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: DFS API Reference
    Path: ../api/dfs.md
---

# Advanced Infrastructure Guide

This guide covers the internal infrastructure components of @fathym/cli that power command discovery, loading, and execution.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Execution Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Input → CLICommandInvocationParser → CLICommandMatcher │
│                                                              │
│                           ↓                                  │
│                                                              │
│  CLICommandResolver ← CLIFileSystemHooks                     │
│         ↓                     ↑                              │
│  Load CommandModule    CLIDFSContextManager                  │
│         ↓                                                    │
│  CLICommandExecutor → CommandRuntime                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## CLICommandResolver

The resolver handles loading commands, configuration, and initialization functions.

```typescript
import { CLICommandResolver } from '@fathym/cli';
```

### Methods

| Method | Purpose |
|--------|---------|
| `ResolveCommandMap(source)` | Get all commands from a source path |
| `LoadCommandInstance(path)` | Load a command module from disk |
| `ResolveConfig(args)` | Load and parse .cli.json |
| `ResolveInitFn(path)` | Load the .cli.init.ts function |
| `ResolveTemplateLocator(dfs)` | Create a template locator |

### Creating a Resolver

```typescript
import { CLICommandResolver, LocalDevCLIFileSystemHooks } from '@fathym/cli';

const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
const hooks = new LocalDevCLIFileSystemHooks(dfsCtx);
const resolver = new CLICommandResolver(hooks);
```

### Loading Commands

```typescript
// Get all commands from a source
const commandMap = await resolver.ResolveCommandMap({
  Path: './commands',
  Root: 'myapp',
});

// Load a specific command
const { Command, Params } = await resolver.LoadCommandInstance(
  '/path/to/commands/deploy.ts'
);
```

### Resolving Configuration

```typescript
const { config, resolvedPath, remainingArgs } = await resolver.ResolveConfig([
  './custom.cli.json',
  'deploy',
  '--env=prod'
]);

console.log(config.Name);        // CLI name
console.log(remainingArgs);      // ['deploy', '--env=prod']
```

---

## CLICommandRegistry

The registry provides programmatic command registration, useful for plugins or dynamic commands.

```typescript
import { CLICommandRegistry } from '@fathym/cli';
```

### Usage

```typescript
const registry = new CLICommandRegistry();

// Register a command
registry.RegisterCommand('deploy', {
  CommandPath: '/path/to/deploy.ts',
  GroupPath: undefined,
  ParentGroup: undefined,
});

// Register a group with command
registry.RegisterCommand('db/migrate', {
  CommandPath: '/path/to/db/migrate.ts',
  GroupPath: '/path/to/db/.metadata.ts',
  ParentGroup: 'db',
});

// Get all registered commands
const commands = registry.GetCommands();
```

### CLICommandEntry Structure

```typescript
interface CLICommandEntry {
  CommandPath?: string;   // Path to command module
  GroupPath?: string;     // Path to .metadata.ts group file
  ParentGroup?: string;   // Parent group key
}
```

### Integration with Resolver

Combine registry with resolver for hybrid command sources:

```typescript
// Load filesystem commands
const fsCommands = await resolver.ResolveCommandMap({
  Path: './commands',
});

// Add programmatic commands
const registry = new CLICommandRegistry();
registry.RegisterCommand('plugin/run', {
  CommandPath: '/plugins/run.ts',
  ParentGroup: 'plugin',
});

// Merge both sources
const allCommands = new Map([
  ...fsCommands,
  ...registry.GetCommands(),
]);
```

---

## CLICommandMatcher

The matcher resolves user input to command instances with hierarchical path matching.

```typescript
import { CLICommandMatcher } from '@fathym/cli';
```

### Matching Algorithm

The matcher uses a greedy algorithm to find the most specific command:

1. Joins all positional args with `/` (e.g., `['db', 'migrate', 'up']` → `'db/migrate/up'`)
2. Tries to match the full path in the command map
3. If no match, removes the last segment and retries
4. Continues until a match is found or no segments remain
5. Remaining segments become the command's positional arguments

### Example Matching

```
Input: mycli db migrate up --force

Tries:
  1. 'db/migrate/up' - no match
  2. 'db/migrate'    - MATCH!

Result:
  - Command: db/migrate
  - Args: ['up']
  - Flags: { force: true }
```

### Usage

```typescript
const matcher = new CLICommandMatcher(resolver);

const match = await matcher.Resolve(
  config,
  commandMap,
  'db/migrate',
  { force: true },
  ['up'],
  './templates',
);

if (match.Command) {
  // Execute the matched command
  await executor.Execute(config, match.Command, {
    key: 'db/migrate',
    flags: match.Flags,
    positional: match.Args,
    paramsCtor: match.Params,
    baseTemplatesDir: './templates',
  });
}
```

### Auto-Help Detection

The matcher automatically shows help when:

- No command key provided (root help)
- `--help` flag is set
- Command key matches a group but not a command
- Command key doesn't match any entry

```typescript
// These all trigger help display:
// mycli --help
// mycli
// mycli db (if 'db' is a group)
// mycli unknown-command
```

---

## CLIFileSystemHooks

Interface for custom filesystem operations. Implement this for alternative loading strategies.

```typescript
import type { CLIFileSystemHooks } from '@fathym/cli';
```

### Interface Definition

```typescript
interface CLIFileSystemHooks {
  ResolveCommandEntryPaths(
    source: CLICommandSource,
  ): Promise<Map<string, CLICommandEntry>>;

  ResolveConfig(args: string[]): Promise<{
    config: CLIConfig;
    resolvedPath: string;
    remainingArgs: string[];
  }>;

  LoadInitFn(
    path: string,
  ): Promise<{ initFn: CLIInitFn | undefined; resolvedInitPath: string }>;

  LoadCommandModule(path: string): Promise<CommandModule>;

  ResolveTemplateLocator(
    dfsHandler?: DFSFileHandler,
  ): Promise<TemplateLocator | undefined>;
}
```

### Built-in: LocalDevCLIFileSystemHooks

The default implementation for local development:

```typescript
import { LocalDevCLIFileSystemHooks } from '@fathym/cli';

const hooks = new LocalDevCLIFileSystemHooks(dfsCtxMgr);
```

Features:
- Scans `./commands` directory for `.ts` files
- Loads `.metadata.ts` files as group metadata
- Resolves paths relative to project root
- Uses DFS for file operations

### Custom Implementation: Remote CLI

Load commands from a remote server:

```typescript
class RemoteCLIHooks implements CLIFileSystemHooks {
  constructor(private baseUrl: string) {}

  async ResolveCommandEntryPaths(source: CLICommandSource) {
    const response = await fetch(`${this.baseUrl}/commands`);
    const commands = await response.json();

    const map = new Map<string, CLICommandEntry>();
    for (const [key, entry] of Object.entries(commands)) {
      map.set(key, entry as CLICommandEntry);
    }
    return map;
  }

  async ResolveConfig(args: string[]) {
    const response = await fetch(`${this.baseUrl}/config`);
    const config = await response.json();
    return { config, resolvedPath: this.baseUrl, remainingArgs: args };
  }

  async LoadCommandModule(path: string) {
    // Load from CDN or remote URL
    return await import(`${this.baseUrl}${path}`);
  }

  async LoadInitFn(path: string) {
    try {
      const mod = await import(`${this.baseUrl}${path}`);
      return { initFn: mod.default, resolvedInitPath: path };
    } catch {
      return { initFn: undefined, resolvedInitPath: path };
    }
  }

  async ResolveTemplateLocator() {
    return undefined; // Templates not supported remotely
  }
}
```

### Custom Implementation: Embedded Commands

For compiled CLIs with bundled commands:

```typescript
import DeployCommand from './commands/deploy.ts';
import BuildCommand from './commands/build.ts';

const embeddedCommands = new Map<string, CommandModule>([
  ['deploy', DeployCommand.Build()],
  ['build', BuildCommand.Build()],
]);

class EmbeddedCLIHooks implements CLIFileSystemHooks {
  async ResolveCommandEntryPaths() {
    const map = new Map<string, CLICommandEntry>();
    for (const key of embeddedCommands.keys()) {
      map.set(key, {
        CommandPath: key,  // Use key as pseudo-path
        GroupPath: undefined,
        ParentGroup: undefined,
      });
    }
    return map;
  }

  async LoadCommandModule(path: string) {
    const mod = embeddedCommands.get(path);
    if (!mod) throw new Error(`Command not found: ${path}`);
    return mod;
  }

  // ... other methods
}
```

---

## Help System

The framework includes automatic help generation from command metadata.

### CLIHelpBuilder

Builds structured help context from command map and metadata:

```typescript
import { CLIHelpBuilder } from '@fathym/cli';

const helpBuilder = new CLIHelpBuilder(resolver);
const helpContext = await helpBuilder.Build(
  config,
  commandMap,
  'deploy',     // Command key (or undefined for root)
  { help: true },
  cmdInstance,   // Optional command instance
  groupInstance, // Optional group instance
);
```

### HelpContext Structure

```typescript
interface HelpContext {
  Sections: HelpSection[];
}

type HelpSection =
  | { type: 'CommandDetails'; Name: string; Description?: string; Usage?: string; Args?: ArgMeta[]; Flags?: FlagMeta[]; Examples?: string[] }
  | { type: 'GroupDetails'; Name: string; Description?: string; Usage?: string; Examples?: string[] }
  | { type: 'CommandList'; title: string; items: CommandModuleMetadata[] }
  | { type: 'GroupList'; title: string; items: CommandModuleMetadata[] }
  | { type: 'Error'; message: string; suggestion?: string; Name: string };
```

### Help Output Example

```
📘 Deploy Command
Deploy application to target environment

Usage:
  mycli deploy <target> [options]

Args:
  <target> - Deployment target (staging, production)

Flags:
  --force - Skip confirmation prompts
  --dry-run - Preview changes without deploying

Examples:
  mycli deploy staging
  mycli deploy production --force
```

### Closest Match Suggestions

When a command is not found, the help system suggests similar commands:

```
❌ Unknown command: depoy
💡 Did you mean: deploy?
```

---

## Command Discovery Flow

Understanding how commands are discovered:

### 1. Source Configuration

In `.cli.json`:

```json
{
  "Sources": [
    { "Path": "./commands" },
    { "Path": "./plugins/commands", "Root": "plugin" }
  ]
}
```

### 2. File Scanning

The hooks scan for `.ts` files:

```
./commands/
├── deploy.ts           → 'deploy'
├── build.ts            → 'build'
├── db/
│   ├── .metadata.ts    → 'db' (group)
│   ├── migrate.ts      → 'db/migrate'
│   └── seed.ts         → 'db/seed'

./plugins/commands/
├── run.ts              → 'plugin/run' (Root prefix applied)
└── test.ts             → 'plugin/test'
```

### 3. Key Generation Rules

| File | Generated Key |
|------|--------------|
| `commands/deploy.ts` | `deploy` |
| `commands/db/migrate.ts` | `db/migrate` |
| `commands/db/.metadata.ts` | `db` (group) |
| `commands/index.ts` | `` (root command) |

### 4. Root Prefix Application

When `Root` is specified in source config, all keys are prefixed:

```json
{ "Path": "./plugins", "Root": "ext" }
```

- `./plugins/run.ts` → `ext/run`
- `./plugins/db/migrate.ts` → `ext/db/migrate`

---

## Integration Points

### Custom Command Loader

Register a custom loader for specific paths:

```typescript
// In .cli.init.ts
import type { IoCContainer } from '@fathym/ioc';
import type { CLIConfig } from '@fathym/cli';

export default async function init(ioc: IoCContainer, config: CLIConfig) {
  // Register custom hooks for specific scenarios
  ioc.Register(CLICommandResolver, () => {
    const dfsCtx = new CLIDFSContextManager(ioc);
    const hooks = new CustomCLIHooks(dfsCtx);
    return new CLICommandResolver(hooks);
  });
}
```

### Middleware Pattern

Add processing before/after command execution:

```typescript
const originalExecute = executor.Execute.bind(executor);

executor.Execute = async (config, runtime, options) => {
  console.log(`[${new Date().toISOString()}] Running: ${options.key}`);
  const start = Date.now();

  try {
    await originalExecute(config, runtime, options);
  } finally {
    console.log(`[${new Date().toISOString()}] Completed in ${Date.now() - start}ms`);
  }
};
```

---

## Related

- [DFS API Reference](../api/dfs.md) - File system context management
- [CLI API Reference](../api/cli.md) - Configuration and execution
- [Building Commands Guide](./building-commands.md) - Command development

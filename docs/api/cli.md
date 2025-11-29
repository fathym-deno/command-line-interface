---
FrontmatterVersion: 1
DocumentType: API
Title: CLI Class API Reference
Summary: API reference for the main CLI orchestrator class.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Architecture Concept
    Path: ../concepts/architecture.md
---

# CLI Class API Reference

API reference for the main `CLI` orchestrator class that coordinates command parsing, resolution, and execution.

## CLI

The `CLI` class is the main entry point for running a command-line interface.

```typescript
import { CLI } from '@fathym/cli';
```

### Constructor

```typescript
constructor(options: CLIOptions)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `CLIOptions` | Configuration options for the CLI |

### CLIOptions

```typescript
interface CLIOptions {
  /** CLI name (shown in help) */
  name: string;

  /** CLI version (shown in version command) */
  version: string;

  /** Path to .cli.json configuration file */
  config: string | URL;

  /** Optional custom command resolver */
  resolver?: CLICommandResolver;

  /** Optional IoC container configuration */
  ioc?: IoCContainerOptions;

  /** Optional DFS handler for file operations */
  dfs?: DFSFileHandler<unknown>;
}
```

---

## Properties

### Name

```typescript
get Name(): string
```

Returns the CLI name from configuration.

### Version

```typescript
get Version(): string
```

Returns the CLI version from configuration.

### Config

```typescript
get Config(): CLIConfig
```

Returns the loaded CLI configuration object.

### IoC

```typescript
get IoC(): IoCContainer
```

Returns the IoC container instance.

### DFSContextManager

```typescript
get DFSContextManager(): CLIDFSContextManager
```

Returns the DFS context manager instance.

---

## Methods

### Run

```typescript
async Run(args: string[]): Promise<number>
```

Main entry point that parses arguments and executes the matched command.

| Parameter | Type | Description |
|-----------|------|-------------|
| `args` | `string[]` | Command-line arguments (typically `Deno.args`) |

**Returns:** Exit code (0 for success, non-zero for errors)

```typescript
const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
});

const exitCode = await cli.Run(Deno.args);
Deno.exit(exitCode);
```

### RegisterCommand

```typescript
RegisterCommand(key: string, command: CommandModule): void
```

Programmatically registers a command.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Command key for matching |
| `command` | `CommandModule` | Command module to register |

```typescript
import MyCommand from './commands/my-command.ts';

cli.RegisterCommand('my-command', MyCommand);
```

### GetCommand

```typescript
async GetCommand(key: string): Promise<CommandModule | undefined>
```

Retrieves a registered command by key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Command key to look up |

**Returns:** The command module if found, undefined otherwise

### ListCommands

```typescript
async ListCommands(): Promise<CommandInfo[]>
```

Returns information about all registered commands.

**Returns:** Array of command information objects

```typescript
interface CommandInfo {
  key: string;
  description: string;
  args?: ArgInfo[];
  flags?: FlagInfo[];
}
```

---

## Execution Flow

```
Run(args)
    │
    ├─▶ Parse argv into invocation
    │       │
    │       └─▶ CLICommandInvocationParser
    │
    ├─▶ Match command key
    │       │
    │       └─▶ CLICommandMatcher
    │
    ├─▶ Resolve command module
    │       │
    │       └─▶ CLICommandResolver
    │
    └─▶ Execute command lifecycle
            │
            └─▶ CLICommandExecutor
                    │
                    ├─▶ ConfigureContext
                    ├─▶ Init
                    ├─▶ Run / DryRun
                    └─▶ Cleanup
```

---

## Usage Examples

### Basic CLI

```typescript
import { CLI } from '@fathym/cli';

const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
});

if (import.meta.main) {
  const code = await cli.Run(Deno.args);
  Deno.exit(code);
}
```

### With Custom Resolver

```typescript
import { CLI, ProgrammaticCLICommandResolver } from '@fathym/cli';
import GreetCommand from './commands/greet.ts';
import DeployCommand from './commands/deploy.ts';

const resolver = new ProgrammaticCLICommandResolver({
  greet: GreetCommand,
  deploy: DeployCommand,
});

const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
  resolver,
});
```

### Programmatic Command Registration

```typescript
import { CLI, Command } from '@fathym/cli';

const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
});

// Register commands programmatically
cli.RegisterCommand('hello', Command('hello', 'Say hello')
  .Run(({ Log }) => Log.Info('Hello!')));

cli.RegisterCommand('goodbye', Command('goodbye', 'Say goodbye')
  .Run(({ Log }) => Log.Info('Goodbye!')));

await cli.Run(Deno.args);
```

### With Custom DFS

```typescript
import { CLI } from '@fathym/cli';
import { MemoryDFSFileHandler } from '@fathym/dfs/handlers';

const memoryDfs = new MemoryDFSFileHandler({});

const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
  dfs: memoryDfs,
});
```

---

## Error Handling

### Command Not Found

```typescript
// When no command matches, help is shown
mycli unknown-command
// Error: Unknown command 'unknown-command'
// Run 'mycli --help' for available commands
```

### Argument Validation

```typescript
// Zod validation errors are formatted for CLI
mycli deploy --replicas=abc
// Error: Invalid value for --replicas: Expected number, got string
```

### Execution Errors

```typescript
// Errors thrown in commands set exit code to 1
try {
  await cli.Run(Deno.args);
} catch (error) {
  console.error(`CLI error: ${error.message}`);
  Deno.exit(1);
}
```

---

## Configuration

### .cli.json Structure

```json
{
  "name": "mycli",
  "version": "1.0.0",
  "commands": {
    "greet": "./commands/greet.ts",
    "deploy": "./commands/deploy.ts",
    "init": "./commands/init.ts"
  },
  "ioc": {
    "ConfigService": {
      "Type": "Singleton",
      "Module": "./services/ConfigService.ts"
    }
  },
  "templates": "./templates",
  "build": {
    "outDir": "./.build"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error) |
| `CLI_DRY_RUN` | Enable dry-run mode globally |
| `NO_COLOR` | Disable colored output |

---

## CLIDFSContextManager

The `CLIDFSContextManager` coordinates multiple DFS handlers for different filesystem scopes
(execution directory, project root, user home, custom directories).

```typescript
import { CLIDFSContextManager } from '@fathym/cli';
```

### Registration Methods

#### RegisterExecutionDFS

```typescript
RegisterExecutionDFS(cwd?: string): string
```

Register a DFS handler for the current execution directory.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | `string` | `Deno.cwd()` | Working directory path |

**Returns:** The registered file root path

```typescript
const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
dfsCtx.RegisterExecutionDFS();  // Uses current directory
dfsCtx.RegisterExecutionDFS('/custom/path');  // Custom path
```

#### RegisterProjectDFS

```typescript
RegisterProjectDFS(
  fileUrlInProject: string,
  name?: string,
  rootFile?: string
): string
```

Register a DFS handler for the project root (walks up to find root file).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fileUrlInProject` | `string` | — | File URL or path within project |
| `name` | `string` | `'project'` | DFS registration name |
| `rootFile` | `string` | `'.cli.json'` | File that marks project root |

**Returns:** The registered project root path

```typescript
// Standard project DFS (walks up to find .cli.json)
dfsCtx.RegisterProjectDFS(import.meta.url);

// Named DFS for config override
dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, 'CLI');
```

#### RegisterUserHomeDFS

```typescript
RegisterUserHomeDFS(): string
```

Register a DFS handler for the user's home directory.

**Returns:** The user home directory path

```typescript
dfsCtx.RegisterUserHomeDFS();
// Windows: C:\Users\username
// Unix: /home/username
```

#### RegisterCustomDFS

```typescript
RegisterCustomDFS(
  name: string,
  details: LocalDFSFileHandlerDetails
): string
```

Register a custom DFS handler with any name and configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique DFS name |
| `details` | `LocalDFSFileHandlerDetails` | Handler configuration |

**Returns:** The registered file root path

```typescript
dfsCtx.RegisterCustomDFS('temp', { FileRoot: '/tmp/mycli' });
dfsCtx.RegisterCustomDFS('output', { FileRoot: './dist' });
```

### Access Methods

#### GetDFS

```typescript
async GetDFS(name: string): Promise<DFSFileHandler>
```

Get a registered DFS handler by name.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | DFS registration name |

**Returns:** The DFS handler

**Throws:** Error if DFS is not registered

```typescript
const dfs = await dfsCtx.GetDFS('project');
const files = await dfs.LoadAllPaths();
```

#### GetExecutionDFS

```typescript
async GetExecutionDFS(): Promise<DFSFileHandler>
```

Get the execution directory DFS handler.

```typescript
const execDfs = await dfsCtx.GetExecutionDFS();
const cwd = await execDfs.ResolvePath('.');
```

#### GetProjectDFS

```typescript
async GetProjectDFS(): Promise<DFSFileHandler>
```

Get the project root DFS handler.

```typescript
const projectDfs = await dfsCtx.GetProjectDFS();
const config = await projectDfs.GetFileInfo('.cli.json');
```

#### GetUserHomeDFS

```typescript
async GetUserHomeDFS(): Promise<DFSFileHandler>
```

Get the user home DFS handler. Auto-registers if not already registered.

```typescript
const homeDfs = await dfsCtx.GetUserHomeDFS();
const configPath = await homeDfs.ResolvePath('.mycli/config.json');
```

#### ResolvePath

```typescript
async ResolvePath(scope: string, ...parts: string[]): Promise<string>
```

Resolve a path within a named DFS scope.

| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | `string` | DFS scope name |
| `parts` | `string[]` | Path segments to join |

**Returns:** Resolved absolute path

```typescript
const templatesPath = await dfsCtx.ResolvePath('project', './templates');
const outputPath = await dfsCtx.ResolvePath('execution', 'dist', 'bundle.js');
```

### Usage Patterns

#### Build Command Pattern

```typescript
// Common pattern for commands that support config override
const Run = async (ctx) => {
  const dfsCtx = await ctx.IoC.Resolve(CLIDFSContextManager);

  // Register based on config override flag
  if (ctx.Params.ConfigOverride) {
    dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, 'CLI');
  }

  // Get the appropriate DFS
  const buildDFS = ctx.Params.ConfigOverride
    ? await dfsCtx.GetDFS('CLI')
    : await dfsCtx.GetExecutionDFS();

  // Use for file operations
  const files = await buildDFS.LoadAllPaths();
};
```

#### User Configuration Pattern

```typescript
// Load user-level configuration from home directory
const loadUserConfig = async (ctx) => {
  const dfsCtx = await ctx.IoC.Resolve(CLIDFSContextManager);
  const homeDfs = await dfsCtx.GetUserHomeDFS();

  const configInfo = await homeDfs.GetFileInfo('.mycli/config.json');
  if (configInfo) {
    return JSON.parse(await new Response(configInfo.Contents).text());
  }
  return {};
};
```

---

## Related

- [Architecture Concept](../concepts/architecture.md) - Framework overview
- [Commands API](./commands.md) - Command runtime API
- [Fluent API](./fluent.md) - Builder pattern API

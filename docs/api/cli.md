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
import { CLI } from "@fathym/cli";
```

### Constructor

```typescript
constructor(options?: CLIOptions, ioc?: IoCContainer)
```

| Parameter | Type           | Default              | Description            |
| --------- | -------------- | -------------------- | ---------------------- |
| `options` | `CLIOptions`   | `{}`                 | Configuration options  |
| `ioc`     | `IoCContainer` | `new IoCContainer()` | IoC container instance |

### CLIOptions

```typescript
type CLIOptions = {
  /** Custom DFS context manager */
  dfsCtxMgr?: CLIDFSContextManager;

  /** Custom command invocation parser */
  parser?: CLICommandInvocationParser;

  /** Custom command resolver */
  resolver?: CLICommandResolver;
};
```

All options are optional. When not provided, defaults are created automatically.

---

## Methods

### RunFromArgs

```typescript
async RunFromArgs(args: string[]): Promise<void>
```

Primary entry point. Resolves configuration, parses arguments, and executes the matched command.

| Parameter | Type       | Description                                    |
| --------- | ---------- | ---------------------------------------------- |
| `args`    | `string[]` | Command-line arguments (typically `Deno.args`) |

```typescript
const cli = new CLI();
await cli.RunFromArgs(Deno.args);
```

### RunWithConfig

```typescript
async RunWithConfig(
  config: CLIConfig,
  args: string[],
  configPath: string
): Promise<void>
```

Run with a pre-loaded configuration. Used in compiled CLIs or testing.

| Parameter    | Type        | Description                             |
| ------------ | ----------- | --------------------------------------- |
| `config`     | `CLIConfig` | The CLI configuration object            |
| `args`       | `string[]`  | Remaining command-line arguments        |
| `configPath` | `string`    | Absolute path to the configuration file |

```typescript
const cli = new CLI();
const config = JSON.parse(await Deno.readTextFile("./.cli.json"));
await cli.RunWithConfig(config, Deno.args, Deno.cwd() + "/.cli.json");
```

---

## Execution Flow

```
RunFromArgs(args)
    │
    ├─▶ resolver.ResolveConfig(args)
    │       └─▶ Find and load .cli.json
    │
    └─▶ RunWithConfig(config, args, path)
            │
            ├─▶ registerTelemetry()
            │
            ├─▶ parser.ParseInvocation()
            │       └─▶ Extract command key, flags, positional args
            │
            ├─▶ initialize()
            │       ├─▶ RegisterExecutionDFS()
            │       └─▶ Run init function (if configured)
            │
            ├─▶ resolveAllCommandSources()
            │       └─▶ Load command modules from all sources
            │
            ├─▶ CLICommandMatcher.Resolve()
            │       └─▶ Find matching command, validate params
            │
            └─▶ CLICommandExecutor.Execute()
                    └─▶ Run command lifecycle
```

---

## Usage Examples

### Basic CLI

```typescript
import { CLI } from "@fathym/cli";

const cli = new CLI();

if (import.meta.main) {
  await cli.RunFromArgs(Deno.args);
}
```

### With Custom Resolver

```typescript
import { CLI, CLICommandResolver } from "@fathym/cli";
import { EmbeddedCLIFileSystemHooks } from "./EmbeddedCLIFileSystemHooks.ts";

const cli = new CLI({
  resolver: new CLICommandResolver(new EmbeddedCLIFileSystemHooks()),
});

await cli.RunFromArgs(Deno.args);
```

### Programmatic Command Registration

Commands can be registered programmatically via `CLICommandRegistry`:

```typescript
import { CLI, CLICommandRegistry, Command } from '@fathym/cli';

const cli = new CLI();

// Get the registry from IoC
const registry = await cli.ioc.Resolve(CLICommandRegistry);

// Register commands
registry.Register('greet', Command('greet', 'Say hello')
  .Params(...)
  .Run(({ Log }) => Log.Info('Hello!'))
  .Build()
);

await cli.RunFromArgs(Deno.args);
```

---

## Configuration

### .cli.json Structure

```json
{
  "Name": "mycli",
  "Version": "1.0.0",
  "Commands": {
    "greet": "./commands/greet.ts",
    "deploy": "./commands/deploy.ts"
  },
  "Init": "./.cli.init.ts",
  "Templates": "./templates"
}
```

### Configuration Fields

| Field       | Type                     | Description                        |
| ----------- | ------------------------ | ---------------------------------- |
| `Name`      | `string`                 | CLI name (shown in help)           |
| `Version`   | `string`                 | CLI version                        |
| `Commands`  | `Record<string, string>` | Command key to module path mapping |
| `Init`      | `string?`                | Path to init function module       |
| `Templates` | `string?`                | Path to templates directory        |

---

## CLIDFSContextManager

The `CLIDFSContextManager` coordinates multiple DFS handlers for different filesystem scopes (execution directory, project root, user home, custom directories).

```typescript
import { CLIDFSContextManager } from "@fathym/cli";
```

### Registration Methods

#### RegisterExecutionDFS

```typescript
RegisterExecutionDFS(cwd?: string): string
```

Register a DFS handler for the current execution directory.

| Parameter | Type     | Default      | Description            |
| --------- | -------- | ------------ | ---------------------- |
| `cwd`     | `string` | `Deno.cwd()` | Working directory path |

**Returns:** The registered file root path

```typescript
const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
dfsCtx.RegisterExecutionDFS(); // Uses current directory
dfsCtx.RegisterExecutionDFS("/custom/path"); // Custom path
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

| Parameter          | Type     | Default       | Description                     |
| ------------------ | -------- | ------------- | ------------------------------- |
| `fileUrlInProject` | `string` | —             | File URL or path within project |
| `name`             | `string` | `'project'`   | DFS registration name           |
| `rootFile`         | `string` | `'.cli.json'` | File that marks project root    |

**Returns:** The registered project root path

```typescript
// Standard project DFS (walks up to find .cli.json)
dfsCtx.RegisterProjectDFS(import.meta.url);

// Named DFS for config override
dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, "CLI");
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

| Parameter | Type                         | Description           |
| --------- | ---------------------------- | --------------------- |
| `name`    | `string`                     | Unique DFS name       |
| `details` | `LocalDFSFileHandlerDetails` | Handler configuration |

**Returns:** The registered file root path

```typescript
dfsCtx.RegisterCustomDFS("temp", { FileRoot: "/tmp/mycli" });
dfsCtx.RegisterCustomDFS("output", { FileRoot: "./dist" });
```

### Access Methods

#### GetDFS

```typescript
async GetDFS(name: string): Promise<DFSFileHandler>
```

Get a registered DFS handler by name.

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `name`    | `string` | DFS registration name |

**Returns:** The DFS handler

**Throws:** Error if DFS is not registered

```typescript
const dfs = await dfsCtx.GetDFS("project");
const files = await dfs.LoadAllPaths();
```

#### GetExecutionDFS

```typescript
async GetExecutionDFS(): Promise<DFSFileHandler>
```

Get the execution directory DFS handler.

```typescript
const execDfs = await dfsCtx.GetExecutionDFS();
const cwd = await execDfs.ResolvePath(".");
```

#### GetProjectDFS

```typescript
async GetProjectDFS(): Promise<DFSFileHandler>
```

Get the project root DFS handler.

```typescript
const projectDfs = await dfsCtx.GetProjectDFS();
const config = await projectDfs.GetFileInfo(".cli.json");
```

#### GetUserHomeDFS

```typescript
async GetUserHomeDFS(): Promise<DFSFileHandler>
```

Get the user home DFS handler. Auto-registers if not already registered.

```typescript
const homeDfs = await dfsCtx.GetUserHomeDFS();
const configPath = await homeDfs.ResolvePath(".mycli/config.json");
```

#### ResolvePath

```typescript
async ResolvePath(scope: string, ...parts: string[]): Promise<string>
```

Resolve a path within a named DFS scope.

| Parameter | Type       | Description           |
| --------- | ---------- | --------------------- |
| `scope`   | `string`   | DFS scope name        |
| `parts`   | `string[]` | Path segments to join |

**Returns:** Resolved absolute path

```typescript
const templatesPath = await dfsCtx.ResolvePath("project", "./templates");
const outputPath = await dfsCtx.ResolvePath("execution", "dist", "bundle.js");
```

### Usage Patterns

#### Build Command Pattern

```typescript
// Common pattern for commands that support config override
const Run = async (ctx) => {
  const dfsCtx = await ctx.IoC.Resolve(CLIDFSContextManager);

  // Register based on config override flag
  if (ctx.Params.ConfigOverride) {
    dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, "CLI");
  }

  // Get the appropriate DFS
  const buildDFS = ctx.Params.ConfigOverride
    ? await dfsCtx.GetDFS("CLI")
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

  const configInfo = await homeDfs.GetFileInfo(".mycli/config.json");
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

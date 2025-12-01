---
FrontmatterVersion: 1
DocumentType: API
Title: DFS Context Management API Reference
Summary: API reference for CLIDFSContextManager and CLIFileSystemHooks for managing filesystem contexts.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Building Commands Guide
    Path: ../guides/building-commands.md
---

# DFS Context Management API Reference

API reference for the Distributed File System (DFS) context management including `CLIDFSContextManager` and `CLIFileSystemHooks`.

## Overview

The DFS context system provides a unified way to manage multiple filesystem scopes in CLI applications:

| Scope       | Purpose                                         | Example                   |
| ----------- | ----------------------------------------------- | ------------------------- |
| `execution` | Current working directory where CLI was invoked | User's terminal location  |
| `project`   | Project root (contains `.cli.json`)             | CLI project source        |
| `user-home` | User's home directory                           | Global config storage     |
| `config`    | User configuration directory                    | `~/.mycli/` via ConfigDFS |
| `custom`    | Any additional named handlers                   | Temp dirs, output paths   |

---

## CLIDFSContextManager

Coordinates multiple DFS handlers for different filesystem scopes.

```typescript
import { CLIDFSContextManager } from "@fathym/cli";
```

### Constructor

```typescript
constructor(ioc: IoCContainer)
```

| Parameter | Type           | Description                        |
| --------- | -------------- | ---------------------------------- |
| `ioc`     | `IoCContainer` | IoC container for DFS registration |

---

## Registration Methods

### RegisterExecutionDFS

```typescript
RegisterExecutionDFS(cwd?: string): string
```

Register a DFS handler for the current execution directory.

| Parameter | Type     | Default      | Description            |
| --------- | -------- | ------------ | ---------------------- |
| `cwd`     | `string` | `Deno.cwd()` | Working directory path |

**Returns:** The registered file root path

```typescript
dfsCtx.RegisterExecutionDFS(); // Uses current directory
dfsCtx.RegisterExecutionDFS("/custom/path"); // Custom path
```

### RegisterProjectDFS

```typescript
RegisterProjectDFS(
  fileUrlInProject: string,
  name?: string,
  rootFile?: string
): string
```

Register a DFS handler for the project root. Walks up the directory tree from the given file URL to find the project root.

| Parameter          | Type     | Default       | Description                         |
| ------------------ | -------- | ------------- | ----------------------------------- |
| `fileUrlInProject` | `string` | -             | File URL or path within the project |
| `name`             | `string` | `'project'`   | DFS registration name               |
| `rootFile`         | `string` | `'.cli.json'` | File that marks project root        |

**Returns:** The registered project root path

**Throws:** Error if no root file is found walking up the directory tree

```typescript
// Standard project DFS
dfsCtx.RegisterProjectDFS(import.meta.url);

// Named DFS for config override
dfsCtx.RegisterProjectDFS(ctx.Params.ConfigOverride, "CLI");
```

### RegisterUserHomeDFS

```typescript
RegisterUserHomeDFS(): string
```

Register a DFS handler for the user's home directory.

**Returns:** The user home directory path

**Throws:** Error if unable to determine home directory

```typescript
dfsCtx.RegisterUserHomeDFS();
// Windows: C:\Users\username
// Unix: /home/username
```

### RegisterCustomDFS

```typescript
RegisterCustomDFS(name: string, details: LocalDFSFileHandlerDetails): string
```

Register a custom DFS handler with any name.

| Parameter | Type                         | Description                     |
| --------- | ---------------------------- | ------------------------------- |
| `name`    | `string`                     | Unique DFS registration name    |
| `details` | `LocalDFSFileHandlerDetails` | Local DFS handler configuration |

**Returns:** The registered file root path

```typescript
dfsCtx.RegisterCustomDFS("temp", { FileRoot: "/tmp/mycli" });
dfsCtx.RegisterCustomDFS("output", { FileRoot: "./dist" });
```

### RegisterConfigDFS

```typescript
async RegisterConfigDFS(options: ConfigDFSOptions): Promise<string>
```

Register a DFS handler for the CLI configuration directory with automatic root resolution.

| Parameter            | Type      | Description                   |
| -------------------- | --------- | ----------------------------- |
| `options.name`       | `string`  | Folder name (e.g., `.mycli`)  |
| `options.token`      | `string`  | CLI token for default env var |
| `options.root`       | `string?` | Explicit root override        |
| `options.rootEnvVar` | `string?` | Custom env var name           |

**Returns:** The absolute config directory path

**Root Resolution Precedence:**

| Priority | Source          | Description                                     |
| -------- | --------------- | ----------------------------------------------- |
| 1        | Custom env var  | If `rootEnvVar` is set and has value            |
| 2        | Explicit root   | If `root` is set in options                     |
| 3        | Default env var | `{TOKEN}_CONFIG_ROOT` if `rootEnvVar` undefined |
| 4        | User home       | Falls back to `~/`                              |

```typescript
// Default behavior - checks MYCLI_CONFIG_ROOT, falls back to ~/
await dfsCtx.RegisterConfigDFS({
  name: ".mycli",
  token: "mycli",
});

// With explicit root
await dfsCtx.RegisterConfigDFS({
  name: ".mycli",
  token: "mycli",
  root: "/data/config",
});

// With custom env var
await dfsCtx.RegisterConfigDFS({
  name: ".mycli",
  token: "mycli",
  rootEnvVar: "MYCLI_DATA_DIR",
});

// Disable env var checking entirely
await dfsCtx.RegisterConfigDFS({
  name: ".mycli",
  token: "mycli",
  rootEnvVar: "", // Empty string disables all env checks
});
```

---

## Access Methods

### GetExecutionDFS

```typescript
async GetExecutionDFS(): Promise<DFSFileHandler>
```

Get the execution directory DFS handler.

**Returns:** The execution DFS handler

```typescript
const execDfs = await dfsCtx.GetExecutionDFS();
const cwd = await execDfs.ResolvePath(".");
```

### GetProjectDFS

```typescript
async GetProjectDFS(): Promise<DFSFileHandler>
```

Get the project root DFS handler.

**Returns:** The project DFS handler

```typescript
const projectDfs = await dfsCtx.GetProjectDFS();
const config = await projectDfs.GetFileInfo(".cli.json");
```

### GetUserHomeDFS

```typescript
async GetUserHomeDFS(): Promise<DFSFileHandler>
```

Get the user home DFS handler. Auto-registers the user home DFS if not already registered.

**Returns:** The user home DFS handler

```typescript
const homeDfs = await dfsCtx.GetUserHomeDFS();
const configPath = await homeDfs.ResolvePath(".mycli/config.json");
```

### GetConfigDFS

```typescript
async GetConfigDFS(): Promise<DFSFileHandler>
```

Get the config DFS handler for accessing user configuration files.

**Returns:** The config DFS handler

**Throws:** Error if ConfigDFS was not registered (requires `ConfigDFSName` in `.cli.json`)

```typescript
const configDfs = await dfsCtx.GetConfigDFS();
const settings = await configDfs.GetFileInfo("settings.json");
const path = await configDfs.ResolvePath("config.json");
```

### GetDFS

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

---

## Path Resolution

### ResolvePath

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

---

## Common Patterns

### Standard CLI Setup

```typescript
import { CLIDFSContextManager } from "@fathym/cli";

// In CLI initialization
const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
dfsCtx.RegisterExecutionDFS();
dfsCtx.RegisterProjectDFS(import.meta.url);

// Access project files
const projectDfs = await dfsCtx.GetProjectDFS();
const config = await projectDfs.GetFileInfo(".cli.json");
```

### Config Override Pattern

Commands often accept a `--config` flag to override the default project location:

```typescript
import { CLIDFSContextManager, Command, CommandParams } from "@fathym/cli";
import type { IoCContainer } from "@fathym/cli";
import { z } from "zod";

const FlagsSchema = z.object({
  config: z.string().optional().describe("Path to .cli.json"),
});

class BuildParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get ConfigPath(): string | undefined {
    return this.Flag("config");
  }
}

export default Command("build", "Build the project")
  .Flags(FlagsSchema)
  .Params(BuildParams)
  .Services(async (ctx, ioc: IoCContainer) => {
    const dfsCtx = await ioc.Resolve(CLIDFSContextManager);

    // Use config override if provided
    if (ctx.Params.ConfigPath) {
      await dfsCtx.RegisterProjectDFS(ctx.Params.ConfigPath, "CLI");
    }

    return {
      buildDFS: ctx.Params.ConfigPath
        ? await dfsCtx.GetDFS("CLI")
        : await dfsCtx.GetExecutionDFS(),
    };
  })
  .Run(async ({ Services }) => {
    // Use Services.buildDFS for file operations...
  });
```

### User Configuration with ConfigDFS

The recommended way to store user configuration is via ConfigDFS. Enable it by setting `ConfigDFSName` in `.cli.json`:

```json
{
  "Name": "My CLI",
  "Tokens": ["mycli"],
  "Version": "1.0.0",
  "ConfigDFSName": ".mycli"
}
```

Then access in commands:

```typescript
import { CLIDFSContextManager, Command, CommandParams } from "@fathym/cli";

export default Command("settings", "Manage settings")
  .Services(async (_, ioc) => ({
    DfsCtx: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const dfsCtx = await Services.DfsCtx;
    const configDfs = await dfsCtx.GetConfigDFS();

    // Read config
    const configFile = await configDfs.GetFileInfo("settings.json");
    if (configFile) {
      const text = await new Response(configFile.Contents).text();
      const settings = JSON.parse(text);
      Log.Info(`API URL: ${settings.apiUrl}`);
    }

    // Write config
    const path = await configDfs.ResolvePath("settings.json");
    await Deno.writeTextFile(
      path,
      JSON.stringify({ apiUrl: "https://api.example.com" }, null, 2),
    );
  });
```

### User Configuration Storage (Legacy)

For CLIs without ConfigDFS enabled, use the user home DFS directly:

```typescript
const homeDfs = await dfsCtx.GetUserHomeDFS();

// Read global config
const configPath = await homeDfs.ResolvePath(".mycli", "config.json");
const configFile = await homeDfs.GetFileInfo(".mycli/config.json");

if (configFile) {
  const configText = await new Response(configFile.Contents).text();
  const globalConfig = JSON.parse(configText);
}

// Write global config
await homeDfs.WriteFile(
  ".mycli/config.json",
  new TextEncoder().encode(JSON.stringify(config, null, 2)),
);
```

### Multiple Output Directories

Register multiple custom DFS handlers for different purposes:

```typescript
// Register output directories
dfsCtx.RegisterCustomDFS("dist", { FileRoot: "./dist" });
dfsCtx.RegisterCustomDFS("temp", { FileRoot: "./tmp" });
dfsCtx.RegisterCustomDFS("cache", { FileRoot: "./.cache" });

// Use each for different operations
const distDfs = await dfsCtx.GetDFS("dist");
const tempDfs = await dfsCtx.GetDFS("temp");
const cacheDfs = await dfsCtx.GetDFS("cache");
```

---

## CLIFileSystemHooks

Interface for custom filesystem operations. Implement this to provide alternative file loading strategies (e.g., remote CLIs, embedded resources).

```typescript
import type { CLIFileSystemHooks } from "@fathym/cli";
```

### Interface Methods

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

| Method                     | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `ResolveCommandEntryPaths` | Discover command modules from source configuration |
| `ResolveConfig`            | Load and parse `.cli.json` configuration           |
| `LoadInitFn`               | Load the `.cli.init.ts` initialization function    |
| `LoadCommandModule`        | Dynamically import a command module                |
| `ResolveTemplateLocator`   | Create a template locator for file generation      |

### Built-in Implementation

The framework provides `LocalDevCLIFileSystemHooks` for standard local development:

```typescript
import { LocalDevCLIFileSystemHooks } from "@fathym/cli";

const hooks = new LocalDevCLIFileSystemHooks(dfsCtxMgr);
```

### Custom Implementation

Implement custom hooks for alternative scenarios:

```typescript
class RemoteCLIFileSystemHooks implements CLIFileSystemHooks {
  async ResolveConfig(args: string[]) {
    // Load config from remote URL
    const response = await fetch("https://cli.example.com/config.json");
    const config = await response.json();
    return { config, resolvedPath: "remote", remainingArgs: args };
  }

  async LoadCommandModule(path: string) {
    // Load command from CDN
    return await import(`https://cdn.example.com/commands/${path}`);
  }

  // ... implement other methods
}
```

---

## DFSFileHandler Methods

The DFS handlers returned by `GetDFS()` methods provide these common operations:

| Method                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `ResolvePath(...parts)` | Join path parts and resolve to absolute path |
| `GetFileInfo(path)`     | Get file info including contents             |
| `WriteFile(path, data)` | Write data to file                           |
| `LoadAllPaths()`        | List all file paths in the handler's root    |
| `Exists(path)`          | Check if path exists                         |

```typescript
const dfs = await dfsCtx.GetProjectDFS();

// Check if file exists
const exists = await dfs.Exists("config.json");

// Read file
const fileInfo = await dfs.GetFileInfo("config.json");
if (fileInfo) {
  const text = await new Response(fileInfo.Contents).text();
}

// Write file
await dfs.WriteFile("output.json", new TextEncoder().encode("{}"));

// List files
const allPaths = await dfs.LoadAllPaths();
```

---

## Related

- [Building Commands Guide](../guides/building-commands.md) - Using DFS in commands
- [Templates API](./templates.md) - Template locators using DFS
- [CLI API](./cli.md) - CLI configuration and initialization

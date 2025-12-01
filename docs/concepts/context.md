---
FrontmatterVersion: 1
DocumentType: Concept
Title: Execution Context
Summary: Understanding the CommandContext, DFS integration, IoC container, and services.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands Concept
    Path: ./commands.md
  - Label: Architecture
    Path: ./architecture.md
---

# Execution Context

The execution context provides commands with access to arguments, services, logging, and file system operations. It's the primary interface between a command and the CLI framework.

## CommandContext Overview

```typescript
interface CommandContext<TArgs, TFlags, TServices> {
  /** Parsed arguments and flags */
  Params: CommandParams<TArgs, TFlags>;

  /** Injected services from IoC */
  Services: TServices;

  /** Logging facade */
  Log: CLILogger;

  /** CLI configuration (.cli.json) */
  Config: CLIConfig;

  /** Invocation metadata */
  Metadata: CommandMetadata;
}
```

## Params

The `Params` object provides type-safe access to parsed arguments and flags.

### Accessing Arguments

```typescript
import { Command, CommandParams } from "@fathym/cli";
import { z } from "zod";

const ArgsSchema = z.tuple([
  z.string().describe("Name"),
  z.number().optional().describe("Times to greet"),
]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Name(): string {
    return this.Arg(0)!;
  }
  get Times(): number {
    return this.Arg(1) ?? 1;
  }
}

Command("greet", "Greet users")
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params }) => {
    for (let i = 0; i < Params.Times; i++) {
      console.log(`Hello, ${Params.Name}!`);
    }
  });
```

### Accessing Flags

```typescript
const FlagsSchema = z.object({
  env: z.string().default("production"),
  force: z.boolean().optional(),
  replicas: z.number().default(1),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string {
    return this.Flag("env") ?? "production";
  }
  get Force(): boolean {
    return this.Flag("force") ?? false;
  }
  get Replicas(): number {
    return this.Flag("replicas") ?? 1;
  }
}

Command("deploy", "Deploy application")
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    console.log(
      `Deploying to ${Params.Environment} with ${Params.Replicas} replicas`,
    );
  });
```

### Custom Params Class

For complex argument logic, extend `CommandParams`:

```typescript
import { CommandParams } from "@fathym/cli";

class DeployParams extends CommandParams<TArgs, TFlags> {
  /** Get target environment with fallback logic */
  get Environment(): string {
    return this.Flag("env") ??
      Deno.env.get("DEPLOY_ENV") ??
      "development";
  }

  /** Check if deploying to production */
  get IsProduction(): boolean {
    return this.Environment === "production";
  }

  /** Get replica count with production minimum */
  get Replicas(): number {
    const requested = this.Flag("replicas") ?? 1;
    return this.IsProduction ? Math.max(requested, 3) : requested;
  }
}

Command("deploy", "Deploy application")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    console.log(
      `Deploying ${Params.Replicas} replicas to ${Params.Environment}`,
    );
  });
```

## Services

Services are dependencies injected via the IoC container.

### Resolving Services

```typescript
import { CLIDFSContextManager, CommandParams } from "@fathym/cli";
import type { IoCContainer } from "@fathym/cli";

const FlagsSchema = z.object({
  target: z.string().default("web").describe("Build target"),
});

class BuildParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Target(): string {
    return this.Flag("target") ?? "web";
  }
}

Command("build", "Build project")
  .Flags(FlagsSchema)
  .Params(BuildParams)
  .Services(async (ctx, ioc: IoCContainer) => ({
    // Resolve by class/constructor
    dfs: await ioc.Resolve(CLIDFSContextManager),

    // Resolve by symbol (for interfaces)
    config: await ioc.Resolve<ConfigService>(ioc.Symbol("ConfigService")),

    // Create inline service using Params getter
    builder: new ProjectBuilder(ctx.Params.Target),
  }))
  .Run(async ({ Services }) => {
    const root = await Services.dfs.GetProjectDFS();
    await Services.builder.build(root);
  });
```

### Service Function Parameters

The `.Services()` method receives two parameters:

```typescript
.Services(async (ctx, ioc) => {
  // ctx: Partial CommandContext
  // - Has: Params, Config, Metadata
  // - Missing: Services (not yet created), Log

  // ioc: IoC Container
  // - Resolve(): Get registered services
  // - Symbol(): Get/create symbol for interface
  // - Register(): Add new services (rare)

  return { /* services object */ };
});
```

### Built-in Services

The framework provides several built-in services:

| Service                | Purpose                |
| ---------------------- | ---------------------- |
| `CLIDFSContextManager` | DFS context management |
| `CLILogger`            | Logging facade         |
| `CLIConfig`            | Configuration access   |
| `TemplateLocator`      | Template discovery     |

## DFS Integration

The CLI integrates with the Distributed File System (DFS) for file operations.

### DFS Context Manager

```typescript
import { CLIDFSContextManager } from "@fathym/cli";

Command("info", "Show project info")
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const { dfs } = Services;

    // Get different DFS contexts
    const executionDfs = await dfs.GetExecutionDFS(); // Current directory
    const projectDfs = await dfs.GetProjectDFS(); // Project root
    const buildDfs = await dfs.GetBuildDFS(); // Build output

    Log.Info(`Execution: ${executionDfs.Root}`);
    Log.Info(`Project: ${projectDfs.Root}`);
    Log.Info(`Build: ${buildDfs.Root}`);
  });
```

### DFS Contexts

| Context        | Description           | Resolution                  |
| -------------- | --------------------- | --------------------------- |
| `ExecutionDFS` | Where CLI was invoked | `Deno.cwd()`                |
| `ProjectDFS`   | Project root          | Walk up to find `.cli.json` |
| `BuildDFS`     | Build artifacts       | Configured in `.cli.json`   |
| `TemplateDFS`  | Template files        | Configured or default       |

### Custom DFS Registration

```typescript
Command("deploy", "Deploy from custom path")
  .Services(async (ctx, ioc) => {
    const dfs = await ioc.Resolve(CLIDFSContextManager);

    // Register custom DFS context
    const targetPath = ctx.Params.Flag("targetDir");
    if (targetPath) {
      dfs.RegisterCustomDFS("Target", { FileRoot: targetPath });
    }

    return {
      sourceDfs: ctx.Params.Flag("targetDir")
        ? await dfs.GetDFS("Target")
        : await dfs.GetExecutionDFS(),
    };
  })
  .Run(async ({ Services }) => {
    const files = await Services.sourceDfs.LoadAllPaths();
    // Process files...
  });
```

### File Operations

```typescript
.Run(async ({ Services }) => {
  const dfs = await Services.dfs.GetProjectDFS();

  // Check if file exists
  const exists = await dfs.HasFile('config.json');

  // Read file
  const info = await dfs.GetFileInfo('config.json');
  if (info) {
    const content = await new Response(info.Contents).text();
  }

  // Write file
  const data = new TextEncoder().encode(JSON.stringify({ key: 'value' }));
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  await dfs.WriteFile('output.json', stream);

  // List files
  const allPaths = await dfs.LoadAllPaths();
});
```

## Logging

The `Log` object provides structured logging with levels.

### Log Levels

```typescript
.Run(({ Log }) => {
  Log.Debug('Detailed debugging info');   // Only shown with LOG_LEVEL=debug
  Log.Info('Standard information');        // Default level
  Log.Warn('Warning message');             // Highlighted warning
  Log.Error('Error message');              // Error output
  Log.Success('Success message');          // Success indicator
});
```

### Formatted Output

```typescript
.Run(({ Log }) => {
  // Simple messages
  Log.Info('Processing files...');

  // With data
  Log.Debug('Config loaded', { env: 'production', replicas: 3 });

  // Progress indicators
  Log.Info('Step 1/3: Building...');
  Log.Info('Step 2/3: Testing...');
  Log.Info('Step 3/3: Deploying...');

  // Final status
  Log.Success('Deployment complete!');
});
```

## Configuration

The `Config` object provides access to `.cli.json` configuration.

```typescript
.Run(({ Config, Log }) => {
  Log.Info(`CLI: ${Config.Name} v${Config.Version}`);

  // Access custom configuration
  const customSetting = Config.custom?.mySetting;
});
```

### Configuration Structure

```typescript
interface CLIConfig {
  /** CLI display name */
  Name: string;

  /** Command tokens (e.g., ["mycli"]) */
  Tokens: string[];

  /** CLI version */
  Version: string;

  /** Commands directory path or source array */
  Commands: string | CLICommandSource[];

  /** Init file path (optional) */
  Init?: string;

  /** Template directory (optional) */
  Templates?: string;

  /** Custom configuration */
  [key: string]: unknown;
}
```

## Metadata

The `Metadata` object provides invocation details.

```typescript
.Run(({ Metadata, Log }) => {
  Log.Debug(`Command: ${Metadata.CommandKey}`);
  Log.Debug(`Invoked at: ${Metadata.InvokedAt}`);
  Log.Debug(`Raw args: ${Metadata.RawArgs.join(' ')}`);
  Log.Debug(`Dry run: ${Metadata.IsDryRun}`);
});
```

### Metadata Properties

| Property        | Type       | Description                                |
| --------------- | ---------- | ------------------------------------------ |
| `CommandKey`    | `string`   | Matched command key                        |
| `InvokedAt`     | `Date`     | Invocation timestamp                       |
| `RawArgs`       | `string[]` | Original argv                              |
| `IsDryRun`      | `boolean`  | Dry-run mode active                        |
| `ParentCommand` | `string?`  | Parent command group (for nested commands) |

## IoC Container

The IoC (Inversion of Control) container manages service lifecycle.

### Registering Services

Services are registered in `.cli.init.ts`:

```typescript
// .cli.init.ts
import { CLIInitFn } from "@fathym/cli";
import { ConfigService } from "./services/ConfigService.ts";
import { DatabaseClient } from "./services/DatabaseClient.ts";

export default (async (ioc, _config) => {
  // Singleton - one instance for entire CLI run
  ioc.Register(() => new ConfigService(), {
    Type: ioc.Symbol("ConfigService"),
  });

  // Each resolution creates a new instance
  ioc.Register(() => new DatabaseClient(), {
    Type: ioc.Symbol("DatabaseClient"),
  });
}) as CLIInitFn;
```

### Service Lifetimes

| Lifetime    | Description                        |
| ----------- | ---------------------------------- |
| `Singleton` | One instance for entire CLI run    |
| `Transient` | New instance per resolution        |
| `Scoped`    | One instance per command execution |

### Resolving Services

```typescript
.Services(async (ctx, ioc) => {
  // By constructor (class-based services)
  const logger = await ioc.Resolve(CLILogger);

  // By symbol (interface-based services)
  const config = await ioc.Resolve<IConfigService>(
    ioc.Symbol('IConfigService')
  );

  return { logger, config };
});
```

## Related

- [Commands Concept](./commands.md) - Command lifecycle
- [Architecture](./architecture.md) - Framework overview
- [CLI API Reference](../api/cli.md) - Detailed API
- [DFS Documentation](../../distributed-file-system/docs/README.md) - DFS details

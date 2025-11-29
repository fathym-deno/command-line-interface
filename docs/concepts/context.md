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
import { Command } from '@fathym/cli';
import { z } from 'zod';

Command('greet', 'Greet users')
  .Args(z.tuple([
    z.string().describe('Name'),
    z.number().optional().describe('Times to greet'),
  ]))
  .Run(({ Params }) => {
    const name = Params.Arg(0);   // string
    const times = Params.Arg(1);  // number | undefined

    for (let i = 0; i < (times ?? 1); i++) {
      console.log(`Hello, ${name}!`);
    }
  });
```

### Accessing Flags

```typescript
Command('deploy', 'Deploy application')
  .Flags(z.object({
    env: z.string().default('production'),
    force: z.boolean().optional(),
    replicas: z.number().default(1),
  }))
  .Run(({ Params }) => {
    const env = Params.Flag('env');        // string
    const force = Params.Flag('force');    // boolean | undefined
    const replicas = Params.Flag('replicas');  // number

    console.log(`Deploying to ${env} with ${replicas} replicas`);
  });
```

### Custom Params Class

For complex argument logic, extend `CommandParams`:

```typescript
import { CommandParams } from '@fathym/cli';

class DeployParams extends CommandParams<TArgs, TFlags> {
  /** Get target environment with fallback logic */
  get Environment(): string {
    return this.Flag('env') ??
           Deno.env.get('DEPLOY_ENV') ??
           'development';
  }

  /** Check if deploying to production */
  get IsProduction(): boolean {
    return this.Environment === 'production';
  }

  /** Get replica count with production minimum */
  get Replicas(): number {
    const requested = this.Flag('replicas') ?? 1;
    return this.IsProduction ? Math.max(requested, 3) : requested;
  }
}

Command('deploy', 'Deploy application')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    console.log(`Deploying ${Params.Replicas} replicas to ${Params.Environment}`);
  });
```

## Services

Services are dependencies injected via the IoC container.

### Resolving Services

```typescript
import { CLIDFSContextManager } from '@fathym/cli';

Command('build', 'Build project')
  .Services(async (ctx, ioc) => ({
    // Resolve by class/constructor
    dfs: await ioc.Resolve(CLIDFSContextManager),

    // Resolve by symbol (for interfaces)
    config: await ioc.Resolve<ConfigService>(ioc.Symbol('ConfigService')),

    // Create inline service
    builder: new ProjectBuilder(ctx.Params.Flag('target')),
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

| Service | Purpose |
|---------|---------|
| `CLIDFSContextManager` | DFS context management |
| `CLILogger` | Logging facade |
| `CLIConfig` | Configuration access |
| `TemplateLocator` | Template discovery |

## DFS Integration

The CLI integrates with the Distributed File System (DFS) for file operations.

### DFS Context Manager

```typescript
import { CLIDFSContextManager } from '@fathym/cli';

Command('info', 'Show project info')
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const { dfs } = Services;

    // Get different DFS contexts
    const executionDfs = await dfs.GetExecutionDFS();  // Current directory
    const projectDfs = await dfs.GetProjectDFS();      // Project root
    const buildDfs = await dfs.GetBuildDFS();          // Build output

    Log.Info(`Execution: ${executionDfs.Root}`);
    Log.Info(`Project: ${projectDfs.Root}`);
    Log.Info(`Build: ${buildDfs.Root}`);
  });
```

### DFS Contexts

| Context | Description | Resolution |
|---------|-------------|------------|
| `ExecutionDFS` | Where CLI was invoked | `Deno.cwd()` |
| `ProjectDFS` | Project root | Walk up to find `.cli.json` |
| `BuildDFS` | Build artifacts | Configured in `.cli.json` |
| `TemplateDFS` | Template files | Configured or default |

### Custom DFS Registration

```typescript
Command('deploy', 'Deploy from custom path')
  .Services(async (ctx, ioc) => {
    const dfs = await ioc.Resolve(CLIDFSContextManager);

    // Register custom DFS context
    const targetPath = ctx.Params.Flag('targetDir');
    if (targetPath) {
      dfs.RegisterCustomDFS('Target', { FileRoot: targetPath });
    }

    return {
      sourceDfs: ctx.Params.Flag('targetDir')
        ? await dfs.GetDFS('Target')
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
  Log.Info(`CLI: ${Config.name} v${Config.version}`);

  // Access custom configuration
  const customSetting = Config.custom?.mySetting;
});
```

### Configuration Structure

```typescript
interface CLIConfig {
  /** CLI name */
  name: string;

  /** CLI version */
  version: string;

  /** Command mappings */
  commands: Record<string, string>;

  /** IoC service registrations */
  ioc?: Record<string, IoCRegistration>;

  /** Template directory */
  templates?: string;

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

| Property | Type | Description |
|----------|------|-------------|
| `CommandKey` | `string` | Matched command key |
| `InvokedAt` | `Date` | Invocation timestamp |
| `RawArgs` | `string[]` | Original argv |
| `IsDryRun` | `boolean` | Dry-run mode active |
| `ParentCommand` | `string?` | Parent command (subcommands) |

## IoC Container

The IoC (Inversion of Control) container manages service lifecycle.

### Registering Services

Services are registered in `.cli.json`:

```json
{
  "ioc": {
    "ConfigService": {
      "Type": "Singleton",
      "Module": "./services/ConfigService.ts"
    },
    "DatabaseClient": {
      "Type": "Transient",
      "Module": "./services/DatabaseClient.ts"
    }
  }
}
```

### Service Lifetimes

| Lifetime | Description |
|----------|-------------|
| `Singleton` | One instance for entire CLI run |
| `Transient` | New instance per resolution |
| `Scoped` | One instance per command execution |

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

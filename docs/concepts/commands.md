---
FrontmatterVersion: 1
DocumentType: Concept
Title: Commands
Summary: Command lifecycle, patterns, and best practices for CLI commands.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Fluent API Concept
    Path: ./fluent-api.md
  - Label: Commands API
    Path: ../api/commands.md
---

# Commands

Commands are the core building blocks of a CLI application. Each command represents a distinct action the user can invoke.

## Command Lifecycle

Every command follows a predictable lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Command Lifecycle                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐                                                  │
│  │ ConfigureContext  │  Setup IoC, register services                    │
│  │    (automatic)    │  Called by executor before Init                  │
│  └─────────┬─────────┘                                                  │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │       Init        │  Initialize command state                        │
│  │    (optional)     │  Prepare resources, validate preconditions       │
│  └─────────┬─────────┘                                                  │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │   Run / DryRun    │  Execute main logic                              │
│  │    (required)     │  DryRun shows what would happen                  │
│  └─────────┬─────────┘                                                  │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │      Cleanup      │  Release resources                               │
│  │    (optional)     │  Called even if Run throws                       │
│  └───────────────────┘                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### ConfigureContext

Called automatically by the executor to set up the command's IoC container and services.

```typescript
// Fluent API: defined via .Services()
Command('deploy', 'Deploy the project')
  .Services(async (ctx, ioc) => ({
    config: await ioc.Resolve(ConfigService),
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }));

// Class-based: override ConfigureContext()
class DeployCommand extends CommandRuntime {
  public override async ConfigureContext(
    ctx: CommandContext,
    ioc: IoCContainer,
  ): Promise<void> {
    await super.ConfigureContext(ctx, ioc);
    this.config = await ioc.Resolve(ConfigService);
  }
}
```

### Init

Optional initialization phase for setting up state or validating preconditions.

```typescript
// Fluent API: use .Init()
Command('deploy', 'Deploy the project')
  .Init(async ({ Log, Services }) => {
    Log.Info('Checking deployment prerequisites...');
    if (!await Services.config.IsConfigured()) {
      throw new Error('Project not configured');
    }
  });

// Class-based: override Init()
class DeployCommand extends CommandRuntime {
  public override async Init(ctx: CommandContext): Promise<void> {
    this.deployTarget = await this.loadDeployTarget();
  }
}
```

### Run / DryRun

The main execution phase. `Run` performs the action; `DryRun` shows what would happen.

```typescript
const FlagsSchema = z.object({
  env: z.string().default('production').describe('Target environment'),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string { return this.Flag('env') ?? 'production'; }
}

Command('deploy', 'Deploy the project')
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(async ({ Params, Log, Services }) => {
    Log.Info(`Deploying to ${Params.Environment}...`);
    await Services.deployer.Deploy(Params.Environment);
    Log.Success('Deployment complete!');
  })
  .DryRun(async ({ Params, Log }) => {
    Log.Info(`Would deploy to ${Params.Environment}`);
    Log.Info('Files that would be deployed:');
    // List files without actually deploying
  });
```

### Cleanup

Optional cleanup phase, called even if `Run` throws an error.

```typescript
Command('process', 'Process files')
  .Services(async (ctx, ioc) => ({
    tempDir: await createTempDir(),
  }))
  .Run(async ({ Services }) => {
    await processFiles(Services.tempDir);
  })
  .Cleanup(async ({ Services, Log }) => {
    await Deno.remove(Services.tempDir, { recursive: true });
    Log.Info('Temporary files cleaned up');
  });
```

## Command Patterns

### Simple Command

A minimal command with no arguments or flags:

```typescript
import { Command, CommandParams } from '@fathym/cli';

class VersionParams extends CommandParams<[], {}> {}

export default Command('version', 'Show version information')
  .Params(VersionParams)
  .Run(({ Log, Config }) => {
    Log.Info(`${Config.Name} v${Config.Version}`);
  });
```

### Command with Arguments

Positional arguments are defined with Zod tuple schemas:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([
  z.string().describe('Name to greet').meta({ argName: 'name' }),
  z.string().optional().describe('Custom greeting').meta({ argName: 'greeting' }),
]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Name(): string { return this.Arg(0)!; }
  get Greeting(): string { return this.Arg(1) ?? 'Hello'; }
}

export default Command('greet', 'Greet someone')
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    Log.Info(`${Params.Greeting}, ${Params.Name}!`);
  });
```

### Command with Flags

Flags are defined with Zod object schemas:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

const FlagsSchema = z.object({
  env: z.string().default('production').describe('Target environment'),
  force: z.boolean().optional().describe('Force deployment'),
  replicas: z.number().default(1).describe('Number of replicas'),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string { return this.Flag('env') ?? 'production'; }
  get Force(): boolean { return this.Flag('force') ?? false; }
  get Replicas(): number { return this.Flag('replicas') ?? 1; }
}

export default Command('deploy', 'Deploy the project')
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Deploying to ${Params.Environment} with ${Params.Replicas} replicas`);
  });
```

### Command with Services

Inject dependencies via the IoC container:

```typescript
import { Command, CommandParams, CLIDFSContextManager } from '@fathym/cli';
import type { IoCContainer } from '@fathym/cli';

class BuildParams extends CommandParams<[], {}> {}

export default Command('build', 'Build the project')
  .Params(BuildParams)
  .Services(async (ctx, ioc: IoCContainer) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
    builder: await ioc.Resolve(ProjectBuilder),
  }))
  .Run(async ({ Services, Log }) => {
    const projectDfs = await Services.dfs.GetProjectDFS();
    Log.Info(`Building from: ${projectDfs.Root}`);
    await Services.builder.Build(projectDfs);
  });
```

### Command with Custom Params

Create a custom params class for complex argument access:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([
  z.string().optional().describe('Project name'),
]);

const FlagsSchema = z.object({
  template: z.string().optional().describe('Template to use'),
});

class InitParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get ProjectName(): string {
    const arg = this.Arg(0);
    return !arg || arg === '.' ? Deno.cwd().split('/').pop()! : arg;
  }

  get Template(): string {
    return this.Flag('template') ?? 'default';
  }
}

export default Command('init', 'Initialize a new project')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(InitParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Creating ${Params.ProjectName} from ${Params.Template} template`);
  });
```

## Command Groups

Commands can be organized hierarchically using directory structure with `.metadata.ts` files:

```
commands/
├── git/
│   ├── .metadata.ts    → mycli git (shows help)
│   ├── commit.ts       → mycli git commit
│   └── push.ts         → mycli git push
```

```typescript
// commands/git/.metadata.ts
import { CommandModuleMetadata } from '@fathym/cli';

export default {
  Name: 'git',
  Description: 'Git operations',
} as CommandModuleMetadata;

// commands/git/commit.ts
const FlagsSchema = z.object({
  message: z.string().describe('Commit message'),
});

class CommitParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Message(): string { return this.Flag('message')!; }
}

// Display name is 'commit', command key is 'git/commit' (from file path)
export default Command('commit', 'Commit changes')
  .Flags(FlagsSchema)
  .Params(CommitParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Committing: ${Params.Message}`);
  });
```

Command matching:
- `mycli git commit -m "msg"` → matches `git/commit`
- `mycli git --help` → shows git group commands

## Error Handling

Commands can throw errors to indicate failure:

```typescript
const FlagsSchema = z.object({
  env: z.string().default('staging').describe('Environment'),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string { return this.Flag('env') ?? 'staging'; }
}

Command('deploy', 'Deploy the project')
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(async ({ Params, Log }) => {
    if (!['staging', 'production'].includes(Params.Environment)) {
      throw new Error(`Invalid environment: ${Params.Environment}`);
    }

    try {
      await performDeployment(Params.Environment);
    } catch (error) {
      Log.Error(`Deployment failed: ${error.message}`);
      throw error; // Re-throw to set exit code
    }
  });
```

Exit codes:
- `0` - Success (no errors)
- `1` - General error (thrown exception)
- Custom codes via `Deno.exit(code)`

## Best Practices

### Keep Commands Focused

Each command should do one thing well:

```typescript
// Good: Single responsibility
Command('build', 'Build the project').Run(...);
Command('deploy', 'Deploy the project').Run(...);

// Avoid: Too many responsibilities
Command('build-and-deploy-and-notify', '...').Run(...);
```

### Use Descriptive Names

Command and flag names should be self-documenting:

```typescript
// Good: Clear intent
Command('generate-config', 'Generate configuration file')
  .Flags(z.object({
    outputPath: z.string().describe('Output file path'),
    overwrite: z.boolean().describe('Overwrite existing file'),
  }));

// Avoid: Cryptic names
Command('gc', 'gc')
  .Flags(z.object({
    o: z.string(),
    w: z.boolean(),
  }));
```

### Provide Helpful Descriptions

All commands, arguments, and flags should have descriptions:

```typescript
Command('deploy', 'Deploy the application to a target environment')
  .Args(z.tuple([
    z.string()
      .describe('Deployment target (e.g., staging, production)')
      .meta({ argName: 'target' }),
  ]))
  .Flags(z.object({
    dryRun: z.boolean()
      .optional()
      .describe('Preview changes without deploying'),
    timeout: z.number()
      .default(300)
      .describe('Deployment timeout in seconds'),
  }));
```

### Handle Async Operations

Use async/await properly and handle cleanup:

```typescript
Command('process', 'Process files')
  .Run(async ({ Log }) => {
    const handle = await openResource();
    try {
      await processWithHandle(handle);
    } finally {
      await handle.close();
    }
  });
```

## Related

- [Fluent API Concept](./fluent-api.md) - Builder pattern details
- [Execution Context](./context.md) - Context object
- [Commands API](../api/commands.md) - API reference
- [Testing Commands Guide](../guides/testing-commands.md) - Testing with intents

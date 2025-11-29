---
FrontmatterVersion: 1
DocumentType: API
Title: Commands API Reference
Summary: API reference for CommandRuntime, CommandContext, and command types.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands Concept
    Path: ../concepts/commands.md
---

# Commands API Reference

API reference for the command runtime system including `CommandRuntime`, `CommandContext`, and `CommandParams`.

## CommandRuntime

The abstract base class for all commands. Extend this class for class-based command definitions.

```typescript
import { CommandRuntime } from '@fathym/cli';
```

### Abstract Properties

#### Key

```typescript
abstract get Key(): string
```

The command key used for matching invocations.

#### Description

```typescript
abstract get Description(): string
```

Human-readable description shown in help.

---

### Lifecycle Methods

#### ConfigureContext

```typescript
async ConfigureContext(
  ctx: CommandContext<TArgs, TFlags, TServices>,
  ioc: IoCContainer,
): Promise<void>
```

Called by the executor to set up IoC and services. Override to add custom service resolution.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ctx` | `CommandContext` | The command context |
| `ioc` | `IoCContainer` | The IoC container |

```typescript
class DeployCommand extends CommandRuntime<TArgs, TFlags, TServices> {
  public override async ConfigureContext(ctx, ioc): Promise<void> {
    await super.ConfigureContext(ctx, ioc);
    this.deployer = await ioc.Resolve(DeployerService);
  }
}
```

#### Init

```typescript
async Init(ctx: CommandContext<TArgs, TFlags, TServices>): Promise<void>
```

Optional initialization phase. Called after ConfigureContext, before Run.

```typescript
public override async Init(ctx): Promise<void> {
  ctx.Log.Debug('Validating configuration...');
  if (!this.deployer.isConfigured()) {
    throw new Error('Deployer not configured');
  }
}
```

#### Run

```typescript
abstract async Run(
  ctx: CommandContext<TArgs, TFlags, TServices>,
): Promise<void>
```

Main execution logic. Must be implemented.

```typescript
public override async Run(ctx): Promise<void> {
  const target = ctx.Params.Flag('env');
  await this.deployer.deploy(target);
  ctx.Log.Success('Deployment complete!');
}
```

#### DryRun

```typescript
async DryRun(ctx: CommandContext<TArgs, TFlags, TServices>): Promise<void>
```

Preview mode execution. Override to show what would happen without side effects.

```typescript
public override async DryRun(ctx): Promise<void> {
  const target = ctx.Params.Flag('env');
  ctx.Log.Info(`Would deploy to: ${target}`);
  ctx.Log.Info('Files that would be deployed:');
  const files = await this.deployer.listFiles();
  files.forEach(f => ctx.Log.Info(`  - ${f}`));
}
```

#### Cleanup

```typescript
async Cleanup(ctx: CommandContext<TArgs, TFlags, TServices>): Promise<void>
```

Resource cleanup phase. Called even if Run throws an error.

```typescript
public override async Cleanup(ctx): Promise<void> {
  await this.deployer.disconnect();
  ctx.Log.Debug('Connection closed');
}
```

---

### Schema Properties

#### ArgsSchema

```typescript
get ArgsSchema(): z.ZodTuple | undefined
```

Override to define positional argument schema.

```typescript
import { z } from 'zod';

public override get ArgsSchema() {
  return z.tuple([
    z.string().describe('Target name'),
  ]);
}
```

#### FlagsSchema

```typescript
get FlagsSchema(): z.ZodObject | undefined
```

Override to define flag schema.

```typescript
public override get FlagsSchema() {
  return z.object({
    env: z.string().default('production'),
    force: z.boolean().optional(),
  });
}
```

---

## CommandContext

The context object passed to all lifecycle methods.

```typescript
interface CommandContext<TArgs, TFlags, TServices> {
  Params: CommandParams<TArgs, TFlags>;
  Services: TServices;
  Log: CLILogger;
  Config: CLIConfig;
  Metadata: CommandMetadata;
}
```

### Properties

#### Params

```typescript
Params: CommandParams<TArgs, TFlags>
```

Provides type-safe access to parsed arguments and flags.

```typescript
.Run(({ Params }) => {
  const name = Params.Arg(0);
  const force = Params.Flag('force');
});
```

#### Services

```typescript
Services: TServices
```

Injected dependencies from the Services() method.

```typescript
.Services(async (ctx, ioc) => ({
  dfs: await ioc.Resolve(CLIDFSContextManager),
}))
.Run(async ({ Services }) => {
  const root = await Services.dfs.GetProjectDFS();
});
```

#### Log

```typescript
Log: CLILogger
```

Logging facade with level-based methods.

```typescript
.Run(({ Log }) => {
  Log.Debug('Starting...');
  Log.Info('Processing...');
  Log.Warn('Caution!');
  Log.Error('Failed!');
  Log.Success('Done!');
});
```

#### Config

```typescript
Config: CLIConfig
```

Access to .cli.json configuration.

```typescript
.Run(({ Config }) => {
  console.log(`${Config.name} v${Config.version}`);
});
```

#### Metadata

```typescript
Metadata: CommandMetadata
```

Invocation metadata.

```typescript
.Run(({ Metadata }) => {
  console.log(`Command: ${Metadata.CommandKey}`);
  console.log(`Dry run: ${Metadata.IsDryRun}`);
});
```

---

## CommandParams

Base class for argument and flag access. Extend for custom accessor methods.

```typescript
import { CommandParams } from '@fathym/cli';
```

### Methods

#### Arg

```typescript
Arg<I extends number>(index: I): TArgs[I]
```

Get a positional argument by index.

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based argument index |

**Returns:** The argument value (type inferred from schema)

```typescript
const name = Params.Arg(0);   // First argument
const count = Params.Arg(1);  // Second argument
```

#### Flag

```typescript
Flag<K extends keyof TFlags>(key: K): TFlags[K]
```

Get a flag value by key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Flag name |

**Returns:** The flag value (type inferred from schema)

```typescript
const env = Params.Flag('env');      // string
const force = Params.Flag('force');  // boolean | undefined
```

### Custom Params Example

```typescript
import { CommandParams } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([z.string().optional()]);
const FlagsSchema = z.object({
  template: z.string().optional(),
  force: z.boolean().optional(),
});

class InitParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get ProjectName(): string {
    const arg = this.Arg(0);
    return !arg || arg === '.' ? 'my-project' : arg;
  }

  get Template(): string {
    return this.Flag('template') ?? 'default';
  }

  get Force(): boolean {
    return this.Flag('force') ?? false;
  }
}

Command('init', 'Initialize project')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(InitParams)
  .Run(({ Params }) => {
    console.log(Params.ProjectName);  // Type-safe
    console.log(Params.Template);     // Type-safe
  });
```

---

## CommandMetadata

Information about the current command invocation.

```typescript
interface CommandMetadata {
  /** The matched command key */
  CommandKey: string;

  /** When the command was invoked */
  InvokedAt: Date;

  /** Original argv array */
  RawArgs: string[];

  /** Whether --dry-run was specified */
  IsDryRun: boolean;

  /** Parent command key (for subcommands) */
  ParentCommand?: string;
}
```

---

## CLILogger

Logging facade with level-based output.

```typescript
interface CLILogger {
  Debug(message: string, data?: unknown): void;
  Info(message: string, data?: unknown): void;
  Warn(message: string, data?: unknown): void;
  Error(message: string, data?: unknown): void;
  Success(message: string, data?: unknown): void;
}
```

### Log Levels

| Level | Environment | Description |
|-------|-------------|-------------|
| `debug` | `LOG_LEVEL=debug` | Verbose debugging |
| `info` | Default | Standard output |
| `warn` | Always shown | Warnings |
| `error` | Always shown | Errors |

### Usage

```typescript
.Run(({ Log }) => {
  Log.Debug('Config loaded', { path: './config.json' });
  Log.Info('Starting build...');
  Log.Warn('Deprecated option used');
  Log.Error('Build failed', { exitCode: 1 });
  Log.Success('Build complete!');
});
```

---

## CLIConfig

Configuration loaded from .cli.json.

```typescript
interface CLIConfig {
  /** CLI name */
  name: string;

  /** CLI version */
  version: string;

  /** Command mappings */
  commands: Record<string, string>;

  /** IoC registrations */
  ioc?: Record<string, IoCRegistration>;

  /** Template directory */
  templates?: string;

  /** Build configuration */
  build?: {
    outDir?: string;
    embeddedTemplates?: string;
  };

  /** Custom properties */
  [key: string]: unknown;
}
```

---

## Types

### CommandModule

The type of exported command modules.

```typescript
type CommandModule = CommandRuntime<any, any, any> | FluentCommandBuilder;
```

### ArgInfo

Argument information for help generation.

```typescript
interface ArgInfo {
  name: string;
  description?: string;
  required: boolean;
  type: string;
}
```

### FlagInfo

Flag information for help generation.

```typescript
interface FlagInfo {
  name: string;
  description?: string;
  type: string;
  default?: unknown;
  required: boolean;
}
```

---

## Related

- [Commands Concept](../concepts/commands.md) - Lifecycle details
- [Fluent API](./fluent.md) - Builder pattern
- [Testing API](./testing.md) - Intent testing

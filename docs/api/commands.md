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
  ctx: CommandContext<TParams, TServices, TCommands>,
  ioc: IoCContainer,
): Promise<CommandContext<TParams, TServices, TCommands>>
```

Called by the executor to set up IoC and services. Override to add custom service resolution.
Returns the configured context (may be the same or a modified context).

| Parameter | Type | Description |
|-----------|------|-------------|
| `ctx` | `CommandContext` | The command context |
| `ioc` | `IoCContainer` | The IoC container |

**Returns:** The configured `CommandContext` (with services populated)

```typescript
class DeployCommand extends CommandRuntime<TParams, TServices, TCommands> {
  public override async ConfigureContext(ctx, ioc): Promise<CommandContext> {
    const configuredCtx = await super.ConfigureContext(ctx, ioc);
    this.deployer = await ioc.Resolve(DeployerService);
    return configuredCtx;
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
  ctx.Log.Info('Validating configuration...');
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
  // Access via custom Params class getters (see CommandParams section)
  await this.deployer.deploy(ctx.Params.Environment);
  ctx.Log.Success('Deployment complete!');
}
```

#### DryRun

```typescript
async DryRun(ctx: CommandContext<TArgs, TFlags, TServices>): Promise<void>
```

Preview mode execution. Override to show what would happen without side effects.
If not overridden, defaults to calling `Run()`.

```typescript
public override async DryRun(ctx): Promise<void> {
  // Access via custom Params class getters (see CommandParams section)
  ctx.Log.Info(`Would deploy to: ${ctx.Params.Environment}`);
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
  ctx.Log.Info('Connection closed');
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

Provides type-safe access to parsed arguments and flags via your custom Params class getters.

```typescript
.Run(({ Params }) => {
  // Access via public getters defined in your Params class
  const name = Params.Name;      // getter calls this.Arg(0)
  const force = Params.Force;    // getter calls this.Flag('force')
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
Log: CommandLog
```

Logging facade with level-based methods.

```typescript
.Run(({ Log }) => {
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
  console.log(`${Config.Name} v${Config.Version}`);
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

Base class for argument and flag access. **Always extend this class** to create
custom getters for accessing arguments and flags.

```typescript
import { CommandParams } from '@fathym/cli';
```

### Public Properties

#### Args

```typescript
public readonly Args: TArgs
```

The raw arguments array. Prefer using the protected `Arg()` method in getters.

#### Flags

```typescript
public readonly Flags: TFlags
```

The raw flags object. Prefer using the protected `Flag()` method in getters.

#### DryRun

```typescript
get DryRun(): boolean
```

Built-in getter that checks if `--dry-run` flag was passed.

### Protected Methods

> **Important:** `Arg()` and `Flag()` are **protected** methods. They are designed
> to be called from within your custom Params class getters, not directly from
> command handlers.

#### Arg (protected)

```typescript
protected Arg<I extends number>(index: I): TArgs[I] | undefined
```

Get a positional argument by index. Call from within a getter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based argument index |

**Returns:** The argument value (type inferred from schema), or undefined

#### Flag (protected)

```typescript
protected Flag<K extends keyof TFlags>(key: K): TFlags[K] | undefined
```

Get a flag value by key. Call from within a getter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Flag name |

**Returns:** The flag value (type inferred from schema), or undefined

### Best Practice: Custom Params Class

**Always create a custom Params class with getters.** This is the recommended pattern
from the fathym-cli implementation:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

// 1. Define schemas
const ArgsSchema = z.tuple([
  z.string().optional().describe('Project name'),
]);

const FlagsSchema = z.object({
  template: z.string().optional().describe('Template to use'),
  force: z.boolean().optional().describe('Skip confirmation'),
});

// 2. Create custom Params class with public getters
class InitParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  /** Get project name with smart defaults */
  get Name(): string {
    const arg = this.Arg(0);  // Protected method
    return !arg || arg === '.' ? '.' : arg;
  }

  /** Get template with default */
  get Template(): string {
    return this.Flag('template') ?? 'init';  // Protected method
  }

  /** Check if force mode is enabled */
  get Force(): boolean {
    return this.Flag('force') ?? false;  // Protected method
  }
}

// 3. Use in command - access via public getters
export default Command('init', 'Initialize a new project')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(InitParams)
  .Run(({ Params, Log }) => {
    // Access through public getters - NOT Params.Arg(0) or Params.Flag('template')
    Log.Info(`Creating ${Params.Name} from ${Params.Template} template`);

    if (Params.Force) {
      Log.Info('Force mode enabled, skipping confirmation');
    }
  });
```

### Why Use Getters?

1. **Encapsulation** - Business logic for defaults stays in the Params class
2. **Type Safety** - Getters can have computed return types
3. **Reusability** - Same logic available in Init, Run, Cleanup phases
4. **Testability** - Params class can be tested independently
5. **Readability** - `Params.Name` is clearer than `Params.Arg(0) ?? '.'`

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

  /** Parent command group key (for nested commands) */
  ParentCommand?: string;
}
```

---

## CommandLog

The logging interface available in command handlers. Provides **four methods** for
output with semantic meaning.

```typescript
type CommandLog = {
  Info: (...args: unknown[]) => void;
  Warn: (...args: unknown[]) => void;
  Error: (...args: unknown[]) => void;
  Success: (...args: unknown[]) => void;
};
```

### Methods

| Method | Purpose | Usage |
|--------|---------|-------|
| `Info` | Standard informational output | Progress updates, status messages |
| `Warn` | Warning messages | Non-fatal issues, deprecations |
| `Error` | Error messages | Failures, exceptions |
| `Success` | Success indicators | Completion messages |

> **Note:** There is no `Debug` or `Trace` method. For debug output, use
> conditional logging based on a verbose flag in your command.

### Usage

```typescript
.Run(({ Params, Log }) => {
  Log.Info('Starting build...');
  Log.Info('📦 Embedded templates →', templatesPath);

  if (someWarning) {
    Log.Warn('Deprecated option used');
  }

  try {
    await performAction();
    Log.Success('Build complete!');
  } catch (error) {
    Log.Error('Build failed:', error.message);
    throw error;
  }
});
```

### Verbose/Debug Pattern

If you need debug-level output, implement it with a flag:

```typescript
const FlagsSchema = z.object({
  verbose: z.boolean().optional().describe('Enable verbose output'),
});

class MyParams extends CommandParams<TArgs, TFlags> {
  get Verbose(): boolean {
    return this.Flag('verbose') ?? false;
  }
}

Command('build', 'Build the project')
  .Flags(FlagsSchema)
  .Params(MyParams)
  .Run(({ Params, Log }) => {
    if (Params.Verbose) {
      Log.Info('Debug: Loading configuration...');
    }
    // ...
  });
```

---

## CLIConfig

Configuration loaded from .cli.json.

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

  /** Init file path (optional, default: .cli.init.ts) */
  Init?: string;

  /** Template directory (optional) */
  Templates?: string;

  /** Custom properties */
  [key: string]: unknown;
}
```

> **Note:** Service registration is done in `.cli.init.ts`, not in `.cli.json`.

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

---
FrontmatterVersion: 1
DocumentType: API
Title: Fluent Builder API Reference
Summary: API reference for the Command fluent builder and CommandModuleBuilder.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Fluent API Concept
    Path: ../concepts/fluent-api.md
---

# Fluent Builder API Reference

API reference for the fluent command builder pattern including `Command()` and `CommandModuleBuilder`.

## Command

The main entry point for creating commands with the fluent API.

```typescript
import { Command } from '@fathym/cli';
```

### Signature

```typescript
function Command(key: string, description: string): CommandBuilder
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Command key for matching |
| `description` | `string` | Human-readable description |

**Returns:** A `CommandBuilder` for method chaining

```typescript
export default Command('greet', 'Greet someone by name')
  .Args(z.tuple([z.string()]))
  .Run(({ Params, Log }) => {
    Log.Info(`Hello, ${Params.Arg(0)}!`);
  });
```

---

## CommandBuilder Methods

### Args

```typescript
Args<T extends z.ZodTuple>(schema: T): CommandBuilder<T, TFlags, TServices>
```

Define positional arguments using a Zod tuple schema.

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `z.ZodTuple` | Zod tuple schema for arguments |

**Returns:** Updated builder with argument types

```typescript
Command('copy', 'Copy files')
  .Args(z.tuple([
    z.string().describe('Source path').meta({ argName: 'source' }),
    z.string().describe('Destination path').meta({ argName: 'dest' }),
  ]))
  .Run(({ Params }) => {
    const source = Params.Arg(0);  // string
    const dest = Params.Arg(1);    // string
  });
```

#### Argument Schema Features

```typescript
// Required argument
z.string().describe('Name')

// Optional argument
z.string().optional().describe('Name')

// With default
z.string().default('World').describe('Name')

// With validation
z.string().min(1).max(100).describe('Name')

// Argument name for help
z.string().describe('Name').meta({ argName: 'name' })
```

---

### Flags

```typescript
Flags<T extends z.ZodObject>(schema: T): CommandBuilder<TArgs, T, TServices>
```

Define flags/options using a Zod object schema.

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `z.ZodObject` | Zod object schema for flags |

**Returns:** Updated builder with flag types

```typescript
Command('deploy', 'Deploy application')
  .Flags(z.object({
    env: z.string().default('production').describe('Target environment'),
    force: z.boolean().optional().describe('Skip confirmation'),
    replicas: z.number().min(1).max(10).default(1).describe('Instance count'),
    tags: z.array(z.string()).optional().describe('Resource tags'),
  }))
  .Run(({ Params }) => {
    const env = Params.Flag('env');        // string
    const force = Params.Flag('force');    // boolean | undefined
    const replicas = Params.Flag('replicas');  // number
    const tags = Params.Flag('tags');      // string[] | undefined
  });
```

#### Flag Schema Features

```typescript
// Boolean flag (--force / --no-force)
z.boolean().optional()

// String flag (--env=prod or --env prod)
z.string()

// Number flag (--count=5)
z.number()

// Enum flag (--level=info)
z.enum(['debug', 'info', 'warn', 'error'])

// Array flag (--tag=one --tag=two)
z.array(z.string())

// With default value
z.string().default('default')

// With validation
z.number().min(1).max(100)
```

---

### Params

```typescript
Params<T extends CommandParams>(
  ParamsClass: new (...args: any[]) => T
): CommandBuilder<TArgs, TFlags, TServices, T>
```

Provide a custom params class for advanced argument access.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ParamsClass` | `Constructor` | Class extending CommandParams |

**Returns:** Updated builder with custom params type

```typescript
import { CommandParams } from '@fathym/cli';

class DeployParams extends CommandParams<TArgs, TFlags> {
  get Environment(): string {
    return this.Flag('env') ?? 'production';
  }

  get IsProduction(): boolean {
    return this.Environment === 'production';
  }
}

Command('deploy', 'Deploy application')
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    console.log(Params.Environment);   // Type-safe access
    console.log(Params.IsProduction);  // Type-safe access
  });
```

---

### Services

```typescript
Services<T>(
  servicesFn: (ctx: CommandContext, ioc: IoCContainer) => Promise<T>
): CommandBuilder<TArgs, TFlags, T>
```

Inject dependencies from the IoC container.

| Parameter | Type | Description |
|-----------|------|-------------|
| `servicesFn` | `Function` | Async function returning services object |

**Returns:** Updated builder with services type

> **Note:** The services function must return a `Promise`. Use `async` for the function.

```typescript
Command('build', 'Build project')
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
    config: await ioc.Resolve(ConfigService),
    builder: new ProjectBuilder(ctx.Params.Flag('target')),
  }))
  .Run(async ({ Services }) => {
    await Services.builder.build();
  });
```

#### Service Function Parameters

```typescript
.Services(async (ctx, ioc) => {
  // ctx: Partial command context
  // - ctx.Params - Parsed arguments and flags
  // - ctx.Config - CLI configuration
  // - ctx.Metadata - Invocation metadata

  // ioc: IoC container
  // - ioc.Resolve(Class) - Resolve by constructor
  // - ioc.Resolve<T>(ioc.Symbol('name')) - Resolve by symbol
  // - ioc.Register(...) - Register new service (rare)

  return { /* services */ };
});
```

---

### Init

```typescript
Init(
  initFn: (ctx: CommandContext) => Promise<void> | void
): CommandBuilder
```

Define initialization logic.

| Parameter | Type | Description |
|-----------|------|-------------|
| `initFn` | `Function` | Initialization function |

**Returns:** Same builder (for chaining)

```typescript
Command('deploy', 'Deploy application')
  .Init(async ({ Params, Log, Services }) => {
    Log.Info('Validating prerequisites...');

    if (Params.Flag('env') === 'production') {
      const ok = await Services.prompt.confirm('Deploy to production?');
      if (!ok) throw new Error('Cancelled');
    }
  })
  .Run(async ({ Services }) => {
    await Services.deployer.deploy();
  });
```

---

### Run

```typescript
Run(
  runFn: (ctx: CommandContext) => Promise<void> | void
): CommandBuilder
```

Define the main execution logic.

| Parameter | Type | Description |
|-----------|------|-------------|
| `runFn` | `Function` | Main execution function |

**Returns:** Same builder (for chaining)

```typescript
Command('greet', 'Greet someone')
  .Args(z.tuple([z.string()]))
  .Run(({ Params, Log }) => {
    const name = Params.Arg(0);
    Log.Info(`Hello, ${name}!`);
  });
```

---

### DryRun

```typescript
DryRun(
  dryRunFn: (ctx: CommandContext) => Promise<void> | void
): CommandBuilder
```

Define preview/simulation logic.

| Parameter | Type | Description |
|-----------|------|-------------|
| `dryRunFn` | `Function` | Dry-run execution function |

**Returns:** Same builder (for chaining)

```typescript
Command('delete', 'Delete files')
  .Args(z.tuple([z.string()]))
  .Run(async ({ Params }) => {
    await Deno.remove(Params.Arg(0), { recursive: true });
  })
  .DryRun(async ({ Params, Log }) => {
    Log.Info(`Would delete: ${Params.Arg(0)}`);
    const files = await listFiles(Params.Arg(0));
    files.forEach(f => Log.Info(`  - ${f}`));
  });
```

---

### Cleanup

```typescript
Cleanup(
  cleanupFn: (ctx: CommandContext) => Promise<void> | void
): CommandBuilder
```

Define cleanup logic (runs even on error).

| Parameter | Type | Description |
|-----------|------|-------------|
| `cleanupFn` | `Function` | Cleanup function |

**Returns:** Same builder (for chaining)

```typescript
Command('process', 'Process data')
  .Services(async () => ({
    tempFile: await Deno.makeTempFile(),
  }))
  .Run(async ({ Services }) => {
    await processFile(Services.tempFile);
  })
  .Cleanup(async ({ Services, Log }) => {
    try {
      await Deno.remove(Services.tempFile);
      Log.Info('Temp file removed');
    } catch {
      Log.Warn('Could not remove temp file');
    }
  });
```

---

### Commands

```typescript
Commands<T extends Record<string, CommandModule>>(
  commands: T
): CommandBuilder
```

Define subcommands that can be invoked from within the parent command.

| Parameter | Type | Description |
|-----------|------|-------------|
| `commands` | `Record<string, CommandModule>` | Map of subcommand keys to modules |

**Returns:** Updated builder with subcommand invokers

```typescript
import SubCommandA from './commands/sub-a.ts';
import SubCommandB from './commands/sub-b.ts';

Command('parent', 'Parent command with subcommands')
  .Commands({
    'sub-a': SubCommandA,
    'sub-b': SubCommandB,
  })
  .Run(async ({ Commands, Log }) => {
    Log.Info('Running subcommand A...');
    await Commands['sub-a']();

    Log.Info('Running subcommand B with args...');
    await Commands['sub-b'](['arg1'], { flag: true });
  });
```

---

## Build

```typescript
Build(): CommandModule
```

Build the command module from the fluent configuration. **Required when calling `.Build()` is needed.**

> **Important:** `.Build()` validates that `Args`, `Flags`, `Params`, and `Run` are all configured.
> If any are missing, it throws an error. This enforces a complete command definition.

```typescript
// Commands must have Args, Flags, Params, and Run configured
export default Command('example', 'Example command')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(ExampleParams)
  .Run(({ Log }) => Log.Info('Done!'))
  .Build();  // Validates and builds the module
```

For testing, always call `.Build()` before passing to `CommandIntent` or `CommandIntents`:

```typescript
CommandIntents('Example Suite', ExampleCommand.Build(), configPath)
  .Intent('test case', (int) => ...)
  .Run();
```

---

## CommandModuleBuilder

Lower-level builder for advanced use cases.

```typescript
import { CommandModuleBuilder } from '@fathym/cli';
```

### Constructor

```typescript
constructor(key: string, description: string)
```

### Methods

The `CommandModuleBuilder` has the same methods as the fluent API (PascalCase):

| Method | Description |
|--------|-------------|
| `Args(schema)` | Set arguments schema |
| `Flags(schema)` | Set flags schema |
| `Params(cls)` | Set custom params class |
| `Services(fn)` | Set services function |
| `Commands(cmds)` | Set subcommands |
| `Init(fn)` | Set init function |
| `Run(fn)` | Set run function |
| `DryRun(fn)` | Set dry-run function |
| `Cleanup(fn)` | Set cleanup function |
| `Build()` | Build the command module |

```typescript
const builder = new CommandModuleBuilder('advanced', 'Advanced command');

builder
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(AdvancedParams)
  .Services(servicesFn)
  .Run(runFn);

export default builder.Build();
```

---

## Type Inference

The fluent API provides full type inference:

```typescript
const ArgsSchema = z.tuple([z.string(), z.number().optional()]);
const FlagsSchema = z.object({
  verbose: z.boolean().optional(),
  count: z.number().default(1),
});

Command('example', 'Example')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Run(({ Params }) => {
    // Types are inferred from schemas
    const name = Params.Arg(0);     // string
    const num = Params.Arg(1);      // number | undefined
    const verbose = Params.Flag('verbose');  // boolean | undefined
    const count = Params.Flag('count');      // number

    // Compile-time errors for invalid access
    Params.Arg(5);           // Error: Index out of bounds
    Params.Flag('unknown');  // Error: Property doesn't exist
  });
```

---

## Related

- [Fluent API Concept](../concepts/fluent-api.md) - Patterns and examples
- [Commands API](./commands.md) - Runtime classes
- [Building Commands Guide](../guides/building-commands.md) - Best practices

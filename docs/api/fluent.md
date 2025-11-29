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
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([z.string().describe('Name to greet')]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Name(): string {
    return this.Arg(0) ?? 'World';
  }
}

export default Command('greet', 'Greet someone by name')
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Hello, ${Params.Name}!`);
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
const ArgsSchema = z.tuple([
  z.string().describe('Source path').meta({ argName: 'source' }),
  z.string().describe('Destination path').meta({ argName: 'dest' }),
]);

class CopyParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Source(): string { return this.Arg(0)!; }
  get Dest(): string { return this.Arg(1)!; }
}

Command('copy', 'Copy files')
  .Args(ArgsSchema)
  .Params(CopyParams)
  .Run(({ Params }) => {
    // Access via getters
    copyFile(Params.Source, Params.Dest);
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
const FlagsSchema = z.object({
  env: z.string().default('production').describe('Target environment'),
  force: z.boolean().optional().describe('Skip confirmation'),
  replicas: z.number().min(1).max(10).default(1).describe('Instance count'),
  tags: z.array(z.string()).optional().describe('Resource tags'),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string { return this.Flag('env') ?? 'production'; }
  get Force(): boolean { return this.Flag('force') ?? false; }
  get Replicas(): number { return this.Flag('replicas') ?? 1; }
  get Tags(): string[] { return this.Flag('tags') ?? []; }
}

Command('deploy', 'Deploy application')
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    // Access via getters - types are inferred
    deploy(Params.Environment, Params.Replicas);
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
  .Flags(FlagsSchema)
  .Params(BuildParams)  // Has .Target getter
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
    config: await ioc.Resolve(ConfigService),
    builder: new ProjectBuilder(ctx.Params.Target),  // Access via getter
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
  .Flags(FlagsSchema)
  .Params(DeployParams)  // Has .IsProduction getter
  .Init(async ({ Params, Log, Services }) => {
    Log.Info('Validating prerequisites...');

    if (Params.IsProduction) {  // Access via getter
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
  .Args(ArgsSchema)
  .Params(GreetParams)  // Has .Name getter
  .Run(({ Params, Log }) => {
    Log.Info(`Hello, ${Params.Name}!`);  // Access via getter
  });
```

---

### DryRun

```typescript
DryRun(
  dryRunFn: (ctx: CommandContext) => Promise<void> | void
): CommandBuilder
```

Define preview/simulation logic for when `--dry-run` flag is passed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `dryRunFn` | `Function` | Dry-run execution function |

**Returns:** Same builder (for chaining)

> **Note:** If `DryRun` is not defined and the user passes `--dry-run`, the command
> will fall back to calling `Run()` instead. Define `DryRun` explicitly when you want
> to show a preview without side effects.

```typescript
class DeleteParams extends CommandParams<TArgs, TFlags> {
  get Path(): string {
    return this.Arg(0) ?? '.';
  }
}

Command('delete', 'Delete files')
  .Args(z.tuple([z.string()]))
  .Params(DeleteParams)
  .Run(async ({ Params }) => {
    await Deno.remove(Params.Path, { recursive: true });
  })
  .DryRun(async ({ Params, Log }) => {
    Log.Info(`Would delete: ${Params.Path}`);
    const files = await listFiles(Params.Path);
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
Commands<T extends Record<string, CommandSource>>(
  commands: T
): CommandBuilder
```

Register commands that can be programmatically invoked from within the current command's Run handler.

| Parameter | Type | Description |
|-----------|------|-------------|
| `commands` | `Record<string, CommandSource>` | Map of command names to builders or modules |

**Returns:** Updated builder with command invokers accessible via `Commands` in the run context

> **Note:** This is for **programmatic invocation** of other commands from within a command.
> For organizing commands into groups (like `mycli db migrate`), use directory structure
> with `.metadata.ts` files - see [Command Groups](../guides/building-commands.md#command-groups).

**Example (from fathym-cli's compile command):**

```typescript
import { join } from '@std/path/join';
import BuildCommand from './build.ts';

Command('compile', 'Compile the CLI into a native binary')
  .Args(CompileArgsSchema)
  .Flags(CompileFlagsSchema)
  .Params(CompileParams)
  .Commands({
    Build: BuildCommand,  // Just pass the builder - Build() is called lazily
  })
  .Services(async (ctx, ioc) => ({
    CLIDFS: await dfsCtx.GetDFS('CLI'),
    CLIRoot: cliRoot,
  }))
  .Run(async ({ Params, Log, Commands, Services }) => {
    // Invoke the Build command programmatically before compiling
    const { Build } = Commands!;
    await Build([], { config: join(Services.CLIRoot, '.cli.json') });

    Log.Info('Build complete, now compiling...');
    // ... compilation logic
  });
```

**Key points:**
- Use **PascalCase** keys (e.g., `Build`, `Deploy`, `Test`)
- Pass the command builder directly (no `.Build()` needed - it's called lazily at runtime)
- Access via destructuring: `const { Build } = Commands!`
- Invoke with args array and flags object: `await Build(args, flags)`
- Full type safety is preserved - TypeScript knows the args/flags types

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
| `Commands(cmds)` | Register commands for programmatic invocation |
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

The fluent API provides full type inference through your custom Params class:

```typescript
const ArgsSchema = z.tuple([z.string(), z.number().optional()]);
const FlagsSchema = z.object({
  verbose: z.boolean().optional(),
  count: z.number().default(1),
});

// Types are inferred from schemas in your Params class getters
class ExampleParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Name(): string { return this.Arg(0)!; }           // string
  get Num(): number | undefined { return this.Arg(1); } // number | undefined
  get Verbose(): boolean { return this.Flag('verbose') ?? false; }
  get Count(): number { return this.Flag('count') ?? 1; }
}

Command('example', 'Example')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(ExampleParams)
  .Run(({ Params }) => {
    // Access via type-safe getters
    console.log(Params.Name);    // string
    console.log(Params.Num);     // number | undefined
    console.log(Params.Verbose); // boolean
    console.log(Params.Count);   // number
  });
```

---

## Related

- [Fluent API Concept](../concepts/fluent-api.md) - Patterns and examples
- [Commands API](./commands.md) - Runtime classes
- [Building Commands Guide](../guides/building-commands.md) - Best practices

---
FrontmatterVersion: 1
DocumentType: Concept
Title: Fluent API
Summary: Deep-dive into the fluent builder pattern for defining CLI commands.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands Concept
    Path: ./commands.md
  - Label: Fluent API Reference
    Path: ../api/fluent.md
---

# Fluent API

The fluent API provides a chainable, type-safe builder pattern for defining CLI commands. It emphasizes readability and discoverability while maintaining full type inference.

## Overview

```typescript
import { Command } from "@fathym/cli";
import { z } from "zod";

export default Command("deploy", "Deploy the application")
  .Args(z.tuple([z.string().describe("Target environment")]))
  .Flags(z.object({ force: z.boolean().optional() }))
  .Services(async (ctx, ioc) => ({ deployer: await ioc.Resolve(Deployer) }))
  .Init(async ({ Log }) => {
    Log.Debug("Initializing...");
  })
  .Run(async ({ Params, Services }) => {
    await Services.deployer.deploy();
  })
  .Cleanup(async ({ Log }) => {
    Log.Debug("Cleanup complete");
  });
```

## Builder Chain

The fluent API uses a progressive builder pattern. Each method returns a new builder with accumulated configuration:

```
Command(key, description)
    │
    ├──▶ .Args(schema)         Define positional arguments
    │         │
    │         ├──▶ .Flags(schema)      Define flags/options
    │         │         │
    │         │         ├──▶ .Params(class)    Custom params accessor
    │         │         │         │
    │         │         │         ├──▶ .Services(fn)   Inject dependencies
    │         │         │         │         │
    │         │         │         │         ├──▶ .Init(fn)      Init phase
    │         │         │         │         │         │
    │         │         │         │         │         ├──▶ .Run(fn)       Main logic
    │         │         │         │         │         │         │
    │         │         │         │         │         │         ├──▶ .DryRun(fn)   Preview mode
    │         │         │         │         │         │         │         │
    │         │         │         │         │         │         │         └──▶ .Cleanup(fn)  Cleanup
```

Methods can be called in any order (except `Command()` must be first), but the above order is conventional.

## Core Methods

### Command(name, description)

Entry point that creates a new command builder:

```typescript
import { Command } from "@fathym/cli";

// The first parameter is the display name (shown in help)
// The actual command key comes from the file's location in the commands directory
const cmd = Command("hello", "Say hello");
```

> **Important:** The first parameter is the **display name** for help output, not the command key. The command key is determined by the file's path relative to the `commands` directory:
>
> - `commands/hello.ts` → command key is `hello`
> - `commands/db/migrate.ts` → command key is `db/migrate`
> - `commands/scaffold/cloud/aws.ts` → command key is `scaffold/cloud/aws`

### .Args(schema)

Define positional arguments using a Zod tuple schema:

```typescript
import { z } from "zod";

const ArgsSchema = z.tuple([
  z.string().describe("First name").meta({ argName: "firstName" }),
  z.string().optional().describe("Last name").meta({ argName: "lastName" }),
]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get FirstName(): string {
    return this.Arg(0)!;
  }
  get LastName(): string | undefined {
    return this.Arg(1);
  }
}

Command("greet", "Greet users")
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params }) => {
    console.log(`Hello, ${Params.FirstName} ${Params.LastName ?? ""}`);
  });
```

Schema requirements:

- Must be a Zod tuple (`z.tuple([...])`)
- Each element describes one positional argument
- Use `.optional()` for optional arguments
- Use `.meta({ argName: 'name' })` for help display

### .Flags(schema)

Define flags/options using a Zod object schema:

```typescript
const FlagsSchema = z.object({
  env: z.string().default("production").describe("Target environment"),
  force: z.boolean().optional().describe("Skip confirmation"),
  replicas: z.number().min(1).max(10).default(1).describe("Instance count"),
  tags: z.array(z.string()).optional().describe("Resource tags"),
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
      `Deploying ${Params.Replicas} replicas to ${Params.Environment}`,
    );
  });
```

Flag features:

- Boolean flags: `--force` or `--no-force`
- Value flags: `--env=staging` or `--env staging`
- Short flags: `-f` (mapped via configuration)
- Array flags: `--tag=one --tag=two`

### .Params(ParamsClass)

Provide a custom params class for complex argument access:

```typescript
import { CommandParams } from "@fathym/cli";

class DeployParams
  extends CommandParams<typeof ArgsSchema, typeof FlagsSchema> {
  get Environment(): string {
    return this.Flag("env") ?? "production";
  }

  get IsProduction(): boolean {
    return this.Environment === "production";
  }

  get Target(): string {
    return this.Arg(0) ?? (this.IsProduction ? "prod-cluster" : "dev-cluster");
  }
}

Command("deploy", "Deploy application")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Run(({ Params }) => {
    // Type-safe access to computed properties
    console.log(Params.Environment); // string
    console.log(Params.IsProduction); // boolean
    console.log(Params.Target); // string
  });
```

### .Services(servicesFn)

Inject dependencies from the IoC container:

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
    dfs: await ioc.Resolve(CLIDFSContextManager),
    config: await ioc.Resolve(ConfigService),
    builder: new ProjectBuilder(ctx.Params.Target),
  }))
  .Run(async ({ Services, Log }) => {
    const root = await Services.dfs.GetProjectDFS();
    Log.Info(`Building from ${root.Root}`);
    await Services.builder.build();
  });
```

Service function parameters:

- `ctx`: Partial command context (has Params, Config, etc.)
- `ioc`: IoC container for dependency resolution

### .Init(initFn)

Define initialization logic:

```typescript
const FlagsSchema = z.object({
  env: z.string().default("staging").describe("Environment"),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string {
    return this.Flag("env") ?? "staging";
  }
  get IsProduction(): boolean {
    return this.Environment === "production";
  }
}

Command("deploy", "Deploy application")
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Init(async ({ Params, Log, Services }) => {
    Log.Info("Validating deployment configuration...");

    if (Params.IsProduction) {
      const confirmed = await Services.prompt.confirm("Deploy to production?");
      if (!confirmed) {
        throw new Error("Deployment cancelled");
      }
    }
  })
  .Run(async ({ Services }) => {
    await Services.deployer.deploy();
  });
```

### .Run(runFn)

Define the main execution logic:

```typescript
const ArgsSchema = z.tuple([z.string().describe("Name")]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Name(): string {
    return this.Arg(0)!;
  }
}

Command("greet", "Greet someone")
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Hello, ${Params.Name}!`);
  });
```

The run function receives the full `CommandContext`:

- `Params` - Argument and flag access
- `Services` - Injected dependencies
- `Log` - Logging facade
- `Config` - CLI configuration
- `Metadata` - Invocation metadata

### .DryRun(dryRunFn)

Define preview/simulation logic:

```typescript
const ArgsSchema = z.tuple([z.string().describe("Path")]);

class DeleteParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Path(): string {
    return this.Arg(0)!;
  }
}

Command("delete", "Delete files")
  .Args(ArgsSchema)
  .Params(DeleteParams)
  .Run(async ({ Params, Log }) => {
    await Deno.remove(Params.Path, { recursive: true });
    Log.Success("Files deleted");
  })
  .DryRun(async ({ Params, Log }) => {
    const files = await listFilesRecursive(Params.Path);
    Log.Info("Would delete the following files:");
    files.forEach((f) => Log.Info(`  - ${f}`));
  });
```

Dry-run is activated via `--dry-run` flag or `CLI_DRY_RUN` env var.

### .Cleanup(cleanupFn)

Define cleanup logic (runs even on error):

```typescript
Command("process", "Process data")
  .Services(async () => ({
    tempFile: await Deno.makeTempFile(),
  }))
  .Run(async ({ Services }) => {
    await processWithTempFile(Services.tempFile);
  })
  .Cleanup(async ({ Services, Log }) => {
    try {
      await Deno.remove(Services.tempFile);
    } catch {
      Log.Warn("Could not remove temp file");
    }
  });
```

## Type Inference

The fluent API provides full type inference through the chain:

```typescript
const ArgsSchema = z.tuple([z.string(), z.number().optional()]);
const FlagsSchema = z.object({ verbose: z.boolean().optional() });

Command("example", "Example command")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Run(({ Params }) => {
    // Types are inferred from schemas
    const name = Params.Arg(0); // string
    const count = Params.Arg(1); // number | undefined
    const verbose = Params.Flag("verbose"); // boolean | undefined

    // Type errors caught at compile time
    Params.Arg(5); // Error: Index out of bounds
    Params.Flag("unknown"); // Error: Property doesn't exist
  });
```

## Advanced Patterns

### Conditional Services

Services can be conditionally created based on params:

```typescript
const FlagsSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure"]).describe("Cloud provider"),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Provider(): string {
    return this.Flag("provider")!;
  }
}

Command("deploy", "Deploy application")
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Services(async (ctx, ioc: IoCContainer) => ({
    deployer: ctx.Params.Provider === "aws"
      ? await ioc.Resolve(AWSDeployer)
      : ctx.Params.Provider === "gcp"
      ? await ioc.Resolve(GCPDeployer)
      : await ioc.Resolve(AzureDeployer),
  }))
  .Run(async ({ Services }) => {
    await Services.deployer.deploy();
  });
```

### Composable Builders

Create reusable command configurations:

```typescript
// Shared configuration
function withVerboseFlag<T extends CommandBuilder>(builder: T) {
  return builder.Flags(z.object({
    verbose: z.boolean().optional().describe("Enable verbose output"),
  }));
}

// Apply to commands
Command("build", "Build project")
  .use(withVerboseFlag)
  .Run(({ Params, Log }) => {
    if (Params.Flag("verbose")) {
      Log.Debug("Verbose mode enabled");
    }
  });
```

### Async Initialization

Services and Init can be async for complex setup:

```typescript
Command("sync", "Sync data")
  .Services(async (ctx, ioc) => {
    const client = await createDatabaseClient(ctx.Params.Flag("db"));
    await client.connect();
    return { client };
  })
  .Init(async ({ Services, Log }) => {
    Log.Info("Checking database schema...");
    await Services.client.validateSchema();
  })
  .Run(async ({ Services }) => {
    await Services.client.sync();
  })
  .Cleanup(async ({ Services }) => {
    await Services.client.disconnect();
  });
```

## Module Builder

For more control, use `CommandModuleBuilder` directly:

```typescript
import { CommandModuleBuilder } from "@fathym/cli";

const builder = new CommandModuleBuilder("advanced", "Advanced command");

builder
  .setArgsSchema(ArgsSchema)
  .setFlagsSchema(FlagsSchema)
  .setServices(servicesFn)
  .setRun(runFn);

export default builder.Build();
```

## Related

- [Commands Concept](./commands.md) - Command lifecycle
- [Execution Context](./context.md) - Context object
- [Fluent API Reference](../api/fluent.md) - Detailed API
- [Building Commands Guide](../guides/building-commands.md) - Patterns and examples

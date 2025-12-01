---
FrontmatterVersion: 1
DocumentType: Guide
Title: Building Commands
Summary: Command patterns, best practices, and advanced techniques for CLI commands.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands Concept
    Path: ../concepts/commands.md
  - Label: Fluent API Concept
    Path: ../concepts/fluent-api.md
---

# Building Commands

This guide covers patterns and best practices for building CLI commands with the Fathym CLI framework.

## The Params Pattern

**Every command must have a custom Params class.** This is the fundamental pattern:

```typescript
import { Command, CommandParams } from "@fathym/cli";
import { z } from "zod";

// 1. Define schemas
const ArgsSchema = z.tuple([
  z.string().optional().describe("Name").meta({ argName: "name" }),
]);

const FlagsSchema = z.object({
  loud: z.boolean().optional().describe("Shout"),
});

// 2. Create Params class with getters
class GreetParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Name(): string {
    return this.Arg(0) ?? "World"; // Protected method in getter
  }

  get IsLoud(): boolean {
    return this.Flag("loud") ?? false; // Protected method in getter
  }
}

// 3. Build command with all parts
export default Command("greet", "Greet someone")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(GreetParams) // REQUIRED!
  .Run(({ Params, Log }) => {
    const msg = `Hello, ${Params.Name}!`;
    Log.Info(Params.IsLoud ? msg.toUpperCase() : msg);
  });
```

> **Important:** The `Arg()` and `Flag()` methods are **protected**. They can only be called from within your Params class getters, not directly in command handlers.

---

## Command Anatomy

Every command has these components:

```typescript
export default Command('deploy', 'Deploy the application')
  // 1. Define what the command accepts
  .Args(ArgsSchema)         // Positional arguments (Zod tuple)
  .Flags(FlagsSchema)       // Named flags/options (Zod object)

  // 2. Custom params accessor (REQUIRED)
  .Params(DeployParams)

  // 3. Inject dependencies
  .Services(async (ctx, ioc) => ({...}))

  // 4. Implement lifecycle
  .Init(async (ctx) => {...})     // Setup
  .Run(async (ctx) => {...})      // Main logic
  .DryRun(async (ctx) => {...})   // Preview mode
  .Cleanup(async (ctx) => {...}); // Teardown
```

---

## Defining Arguments

### Required Arguments

```typescript
const ArgsSchema = z.tuple([
  z.string().describe("Source file").meta({ argName: "source" }),
  z.string().describe("Destination").meta({ argName: "dest" }),
]);

class CopyParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Source(): string {
    return this.Arg(0)!;
  }
  get Dest(): string {
    return this.Arg(1)!;
  }
}

Command("copy", "Copy a file")
  .Args(ArgsSchema)
  .Params(CopyParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Copying ${Params.Source} to ${Params.Dest}`);
  });
```

### Optional Arguments

```typescript
const ArgsSchema = z.tuple([
  z.string().optional().describe("Name").meta({ argName: "name" }),
]);

class GreetParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Name(): string {
    return this.Arg(0) ?? "World"; // Default in getter
  }
}

Command("greet", "Greet someone")
  .Args(ArgsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Hello, ${Params.Name}!`);
  });
```

### Arguments with Defaults

```typescript
const ArgsSchema = z.tuple([
  z.coerce.number().default(3000).describe("Port").meta({ argName: "port" }),
]);

class ServeParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Port(): number {
    return this.Arg(0) ?? 3000;
  }
}

Command("serve", "Start a server")
  .Args(ArgsSchema)
  .Params(ServeParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Starting on port ${Params.Port}`);
  });
```

### Variadic Arguments

```typescript
const ArgsSchema = z.tuple([
  z.string().describe("Output file").meta({ argName: "output" }),
]).rest(z.string());

class ConcatParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Output(): string {
    return this.Arg(0)!;
  }
  get Inputs(): string[] {
    return this.Args.slice(1) as string[];
  }
}

Command("concat", "Concatenate files")
  .Args(ArgsSchema)
  .Params(ConcatParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Concatenating ${Params.Inputs.length} files to ${Params.Output}`);
  });
```

---

## Defining Flags

### Boolean Flags

```typescript
const FlagsSchema = z.object({
  verbose: z.boolean().optional().describe("Enable verbose output"),
  force: z.boolean().optional().describe("Skip confirmation"),
  quiet: z.boolean().optional().describe("Suppress output"),
});

class BuildParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Verbose(): boolean {
    return this.Flag("verbose") ?? false;
  }
  get Force(): boolean {
    return this.Flag("force") ?? false;
  }
  get Quiet(): boolean {
    return this.Flag("quiet") ?? false;
  }
}
```

Usage:

```bash
mycli build --verbose --force
mycli build --no-verbose  # Explicitly false
```

### String Flags

```typescript
const FlagsSchema = z.object({
  env: z.string().default("development").describe("Environment"),
  config: z.string().optional().describe("Config file path"),
});

class DeployParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Environment(): string {
    return this.Flag("env") ?? "development";
  }
  get ConfigPath(): string | undefined {
    return this.Flag("config");
  }
}
```

Usage:

```bash
mycli deploy --env=production
mycli deploy --env production
mycli deploy --config ./config.json
```

### Number Flags

```typescript
const FlagsSchema = z.object({
  port: z.coerce.number().default(3000).describe("Server port"),
  timeout: z.coerce.number().optional().describe("Timeout in seconds"),
  retries: z.coerce.number().min(0).max(10).default(3).describe("Retry count"),
});

class ServerParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Port(): number {
    return this.Flag("port") ?? 3000;
  }
  get Timeout(): number | undefined {
    return this.Flag("timeout");
  }
  get Retries(): number {
    return this.Flag("retries") ?? 3;
  }
}
```

### Enum Flags

```typescript
const FlagsSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  format: z.enum(["json", "text", "table"]).optional(),
});

class OutputParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Level(): string {
    return this.Flag("level") ?? "info";
  }
  get Format(): string {
    return this.Flag("format") ?? "text";
  }
}
```

### Array Flags

```typescript
const FlagsSchema = z.object({
  include: z.array(z.string()).optional().describe("Files to include"),
  exclude: z.array(z.string()).optional().describe("Files to exclude"),
});

class FilterParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Includes(): string[] {
    return this.Flag("include") ?? [];
  }
  get Excludes(): string[] {
    return this.Flag("exclude") ?? [];
  }
}
```

Usage:

```bash
mycli build --include=src --include=lib --exclude=test
```

---

## Custom Params Classes

For complex argument logic, create a custom params class:

```typescript
import { CommandParams } from "@fathym/cli";
import { z } from "zod";

const ArgsSchema = z.tuple([
  z.string().optional().describe("Project name"),
]);

const FlagsSchema = z.object({
  template: z.string().optional(),
  force: z.boolean().optional(),
  outputDir: z.string().optional(),
});

class InitParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  /** Get project name with smart defaults */
  get ProjectName(): string {
    const arg = this.Arg(0);
    if (!arg || arg === ".") {
      // Use current directory name
      return Deno.cwd().split(/[\\/]/).pop() ?? "project";
    }
    return arg;
  }

  /** Get template with default */
  get Template(): string {
    return this.Flag("template") ?? "default";
  }

  /** Get output directory */
  get OutputDir(): string {
    return this.Flag("outputDir") ?? this.ProjectName;
  }

  /** Whether to skip confirmations */
  get Force(): boolean {
    return this.Flag("force") ?? false;
  }
}

export default Command("init", "Initialize a new project")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(InitParams)
  .Run(({ Params, Log }) => {
    Log.Info(`Creating ${Params.ProjectName} from ${Params.Template}`);
    Log.Info(`Output: ${Params.OutputDir}`);
  });
```

---

## Service Injection

### Basic Service Injection

```typescript
import { CLIDFSContextManager, CommandParams } from "@fathym/cli";
import type { IoCContainer } from "@fathym/cli";

class InfoParams extends CommandParams<[], {}> {}

Command("info", "Show project info")
  .Params(InfoParams)
  .Services(async (ctx, ioc: IoCContainer) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const root = await Services.dfs.GetProjectDFS();
    Log.Info(`Project: ${root.Root}`);
  });
```

### Multiple Services

```typescript
.Services(async (ctx, ioc: IoCContainer) => ({
  dfs: await ioc.Resolve(CLIDFSContextManager),
  config: await ioc.Resolve(ConfigService),
  api: await ioc.Resolve(APIClient),
}))
```

### Conditional Services

```typescript
class DeployParams extends CommandParams<[], TFlags> {
  get Provider(): string {
    return this.Flag("provider") ?? "local";
  }
}

Command("deploy", "Deploy")
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Services(async (ctx, ioc: IoCContainer) => {
    const provider = ctx.Params.Provider;

    return {
      deployer: provider === "aws"
        ? await ioc.Resolve(AWSDeployer)
        : provider === "gcp"
        ? await ioc.Resolve(GCPDeployer)
        : await ioc.Resolve(LocalDeployer),
    };
  });
```

### Inline Services

```typescript
class BuildParams extends CommandParams<[], TFlags> {
  get Target(): string {
    return this.Flag("target") ?? "web";
  }
  get Minify(): boolean {
    return this.Flag("minify") ?? false;
  }
}

Command("build", "Build project")
  .Flags(FlagsSchema)
  .Params(BuildParams)
  .Services(async (ctx) => ({
    // Create service with params
    builder: new ProjectBuilder({
      target: ctx.Params.Target,
      minify: ctx.Params.Minify,
    }),

    // Create temp resources
    tempDir: await Deno.makeTempDir(),
  }));
```

---

## Command Lifecycle

### Init Phase

Use for validation and setup before the main logic:

```typescript
class DeployParams extends CommandParams<[], TFlags> {
  get Environment(): string {
    return this.Flag("env") ?? "development";
  }
  get Force(): boolean {
    return this.Flag("force") ?? false;
  }
  get IsProduction(): boolean {
    return this.Environment === "production";
  }
}

Command("deploy", "Deploy")
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Init(async ({ Params, Services, Log }) => {
    Log.Info("Validating configuration...");

    // Check preconditions
    const config = await Services.config.load();
    if (!config.isValid) {
      throw new Error("Invalid configuration");
    }

    // Confirm destructive operations
    if (Params.IsProduction && !Params.Force) {
      const confirmed = await Services.prompt.confirm("Deploy to production?");
      if (!confirmed) {
        throw new Error("Deployment cancelled");
      }
    }
  });
```

### Run Phase

The main execution logic:

```typescript
.Run(async ({ Params, Services, Log }) => {
  Log.Info(`Deploying to ${Params.Environment}...`);

  const result = await Services.deployer.deploy({
    environment: Params.Environment,
    force: Params.Force,
  });

  Log.Success(`Deployed version ${result.version}`);
})
```

### Dry Run Phase

Preview mode that shows what would happen:

```typescript
.DryRun(async ({ Params, Services, Log }) => {
  Log.Info(`Would deploy to ${Params.Environment}`);

  const changes = await Services.deployer.preview();
  Log.Info('Changes that would be made:');
  changes.forEach(c => Log.Info(`  - ${c.type}: ${c.path}`));
})
```

> **Note:** If `DryRun` is not defined and the user passes `--dry-run`, the command will fall back to calling `Run()`.

### Cleanup Phase

Resource cleanup (runs even on error):

```typescript
.Cleanup(async ({ Services, Log }) => {
  // Clean up temp resources
  if (Services.tempDir) {
    try {
      await Deno.remove(Services.tempDir, { recursive: true });
      Log.Info('Cleaned up temp directory');
    } catch {
      Log.Warn('Could not clean up temp directory');
    }
  }

  // Close connections
  if (Services.connection) {
    await Services.connection.close();
  }
})
```

---

## Error Handling

### Throwing Errors

```typescript
class ReadParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get FilePath(): string {
    return this.Arg(0)!;
  }
}

Command("read", "Read a file")
  .Args(ArgsSchema)
  .Params(ReadParams)
  .Run(async ({ Params, Log }) => {
    if (!await fileExists(Params.FilePath)) {
      throw new Error(`File not found: ${Params.FilePath}`);
    }

    // Continue processing...
  });
```

### Error Recovery

```typescript
class ApiParams extends CommandParams<[], TFlags> {
  get MaxRetries(): number {
    return this.Flag("retries") ?? 3;
  }
}

Command("sync", "Sync data")
  .Flags(FlagsSchema)
  .Params(ApiParams)
  .Run(async ({ Params, Log, Services }) => {
    let lastError: Error | undefined;

    for (let i = 0; i < Params.MaxRetries; i++) {
      try {
        await Services.api.sync();
        Log.Success("Sync successful");
        return;
      } catch (error) {
        lastError = error;
        Log.Warn(`Attempt ${i + 1} failed: ${error.message}`);
        await delay(1000 * (i + 1)); // Exponential backoff
      }
    }

    throw new Error(
      `Failed after ${Params.MaxRetries} attempts: ${lastError?.message}`,
    );
  });
```

### Validation Errors

```typescript
class SendParams extends CommandParams<[], TFlags> {
  get Email(): string {
    return this.Flag("email") ?? "";
  }
}

Command("send", "Send notification")
  .Flags(FlagsSchema)
  .Params(SendParams)
  .Run(({ Params, Log }) => {
    if (!Params.Email.includes("@")) {
      throw new Error("Invalid email format");
    }

    // Process valid email...
  });
```

---

## Command Groups

Command groups let you organize related commands under a common prefix (e.g., `mycli scaffold cloud init`). Use directory structure with `.metadata.ts` files.

### Directory Structure

```
commands/
├── deploy.ts                    → mycli deploy
├── scaffold/
│   ├── .metadata.ts             → mycli scaffold (group metadata)
│   ├── component.ts             → mycli scaffold component
│   └── cloud/
│       ├── .metadata.ts         → mycli scaffold cloud (nested group)
│       └── init.ts              → mycli scaffold cloud init
└── db/
    ├── .metadata.ts             → mycli db (group metadata)
    ├── migrate.ts               → mycli db migrate
    └── seed.ts                  → mycli db seed
```

### Group Metadata File

Create a `.metadata.ts` file in each group directory:

```typescript
// commands/scaffold/.metadata.ts
import { CommandModuleMetadata } from "@fathym/cli";

export default {
  Name: "scaffold",
  Description: "Generate new project components",
} as CommandModuleMetadata;
```

```typescript
// commands/scaffold/cloud/.metadata.ts
import { CommandModuleMetadata } from "@fathym/cli";

export default {
  Name: "scaffold/cloud",
  Description: "Scaffold cloud infrastructure components",
} as CommandModuleMetadata;
```

### Commands in Groups

Commands in a group directory work the same as regular commands:

```typescript
// commands/db/migrate.ts
const FlagsSchema = z.object({
  steps: z.number().optional().describe("Number of migrations"),
});

class MigrateParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Steps(): number | undefined {
    return this.Flag("steps");
  }
}

// Display name is 'migrate', command key is 'db/migrate' (from file path)
export default Command("migrate", "Run database migrations")
  .Flags(FlagsSchema)
  .Params(MigrateParams)
  .Run(async ({ Params, Log }) => {
    Log.Info(`Running ${Params.Steps ?? "all"} migrations...`);
  });
```

### CLI Configuration

Point to the commands directory:

```json
{
  "Tokens": ["mycli"],
  "Commands": "./commands"
}
```

The framework automatically discovers commands from the directory structure.

---

## Best Practices

### 1. Always Use Custom Params Classes

```typescript
// Required - always create a Params class
class MyParams extends CommandParams<TArgs, TFlags> {
  get Name(): string {
    return this.Arg(0) ?? "default";
  }
}

Command("my-cmd", "Description")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(MyParams) // Required!
  .Run(({ Params }) => {
    console.log(Params.Name); // Access via getter
  });
```

### 2. Keep Commands Focused

Each command should do one thing well:

```typescript
// Good
Command("build", "Build the project");
Command("test", "Run tests");
Command("deploy", "Deploy the application");

// Avoid
Command("build-test-deploy", "Do everything");
```

### 3. Use Descriptive Names

```typescript
// Good
const FlagsSchema = z.object({
  outputPath: z.string().describe("Output file path"),
  skipTests: z.boolean().describe("Skip running tests"),
});

// Avoid
const FlagsSchema = z.object({
  o: z.string(),
  s: z.boolean(),
});
```

### 4. Provide Defaults in Params Class

```typescript
class ConfigParams extends CommandParams<[], TFlags> {
  get Environment(): string {
    return this.Flag("env") ?? "development";
  }
  get Port(): number {
    return this.Flag("port") ?? 3000;
  }
  get Retries(): number {
    return this.Flag("retries") ?? 3;
  }
}
```

### 5. Validate Early

```typescript
.Init(async ({ Params, Services }) => {
  // Validate before expensive operations
  const config = await Services.config.load();
  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mycli config set apiKey');
  }
})
```

### 6. Use Dry Run

```typescript
.DryRun(async ({ Params, Log }) => {
  Log.Info('Would perform the following actions:');
  // Show what would happen
})
.Run(async ({ Params, Log }) => {
  Log.Info('Performing actions...');
  // Actually do it
})
```

### 7. Use Correct Logging Methods

```typescript
.Run(({ Log }) => {
  Log.Info('Standard output');   // Default level
  Log.Warn('Warning message');   // Highlighted
  Log.Error('Error message');    // Error output
  Log.Success('Success!');       // Success indicator
});
```

> **Note:** There is no `Log.Debug` method. For debug output, use a verbose flag and conditional logging.

---

## Help System Integration

The CLI framework automatically generates help output from your command's Zod schemas using meta attributes.

### Meta Attributes

Use `.meta()` on Zod schemas to customize help output:

```typescript
const ArgsSchema = z.tuple([
  z.string()
    .describe("Project name")
    .meta({ argName: "name" }), // Display as <name> in help
  z.string()
    .optional()
    .describe("Output directory")
    .meta({ argName: "output" }), // Display as <output> in help
]);

const FlagsSchema = z.object({
  v: z.boolean()
    .optional()
    .describe("Verbose output")
    .meta({ flagName: "verbose" }), // Display as --verbose in help
  t: z.string()
    .optional()
    .describe("Template to use")
    .meta({ flagName: "template" }), // Display as --template in help
});
```

### Available Meta Attributes

| Attribute  | Schema Type               | Purpose                          |
| ---------- | ------------------------- | -------------------------------- |
| `argName`  | Args (tuple items)        | Custom name in `<name>` format   |
| `flagName` | Flags (object properties) | Custom name for `--flag` display |

### Without Meta Attributes

Without `.meta()`, arguments display as generic names:

```typescript
// Schema without meta
const ArgsSchema = z.tuple([
  z.string().describe("Project name"),
  z.string().optional().describe("Output"),
]);

// Help shows: <arg1> <arg2>
// Instead of: <name> <output>
```

### Generated Help Output

The help system extracts information from schemas:

```typescript
Command('init', 'Initialize a new project')
  .Args(z.tuple([
    z.string().describe('Project name').meta({ argName: 'name' }),
  ]))
  .Flags(z.object({
    template: z.string().optional().describe('Template to use'),
    force: z.boolean().optional().describe('Overwrite existing files'),
  }))
  .Params(InitParams)
  .Run(...);
```

Generates:

```
📘 Command: Init
Initialize a new project

Usage:
  mycli init <name> [--template] [--force]

Args:
  <name> - Project name

Flags:
  --template - Template to use
  --force - Overwrite existing files
```

### Automatic --help Flag

The `--help` flag is handled automatically:

```bash
mycli init --help      # Shows init command help
mycli db --help        # Shows db group help
mycli --help           # Shows CLI root help
```

### Group Metadata Files

Create `.metadata.ts` files for command groups (simple object format):

```typescript
// commands/db/.metadata.ts
import { CommandModuleMetadata } from "@fathym/cli";

export default {
  Name: "db",
  Description: "Database management commands",
} as CommandModuleMetadata;
```

See [Command Groups](#command-groups) for more details on organizing commands with directories.

### Custom Examples

Add examples via class-based commands:

```typescript
class DeployCommand extends CommandRuntime<DeployParams> {
  get Key() {
    return "deploy";
  }
  get Description() {
    return "Deploy the application";
  }

  BuildMetadata() {
    return this.buildMetadataFromSchemas(
      "Deploy",
      "Deploy the application to an environment",
      ArgsSchema,
      FlagsSchema,
    );
  }

  // Add custom examples
  get Examples(): string[] {
    return [
      "mycli deploy staging",
      "mycli deploy production --force",
      "mycli deploy --dry-run",
    ];
  }
}
```

---

## Related

- [Commands Concept](../concepts/commands.md) - Lifecycle details
- [Fluent API Concept](../concepts/fluent-api.md) - Builder pattern
- [Testing Commands](./testing-commands.md) - Test your commands
- [CLI Configuration](./cli-configuration.md) - Project setup
- [Advanced Infrastructure](./advanced-infrastructure.md) - Help system internals

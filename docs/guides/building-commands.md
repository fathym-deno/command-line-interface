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

## Command Anatomy

Every command has these components:

```typescript
import { Command } from '@fathym/cli';
import { z } from 'zod';

export default Command('deploy', 'Deploy the application')
  // 1. Define what the command accepts
  .Args(z.tuple([...]))       // Positional arguments
  .Flags(z.object({...}))     // Named flags/options

  // 2. Optionally customize params access
  .Params(DeployParams)       // Custom params class

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
Command('copy', 'Copy a file')
  .Args(z.tuple([
    z.string().describe('Source file').meta({ argName: 'source' }),
    z.string().describe('Destination').meta({ argName: 'dest' }),
  ]))
  .Run(({ Params, Log }) => {
    const source = Params.Arg(0);  // Required - string
    const dest = Params.Arg(1);    // Required - string
    Log.Info(`Copying ${source} to ${dest}`);
  });
```

### Optional Arguments

```typescript
Command('greet', 'Greet someone')
  .Args(z.tuple([
    z.string().optional().describe('Name').meta({ argName: 'name' }),
  ]))
  .Run(({ Params, Log }) => {
    const name = Params.Arg(0) ?? 'World';  // Optional with default
    Log.Info(`Hello, ${name}!`);
  });
```

### Arguments with Defaults

```typescript
Command('serve', 'Start a server')
  .Args(z.tuple([
    z.coerce.number().default(3000).describe('Port').meta({ argName: 'port' }),
  ]))
  .Run(({ Params, Log }) => {
    const port = Params.Arg(0);  // number, defaults to 3000
    Log.Info(`Starting on port ${port}`);
  });
```

### Variadic Arguments

```typescript
Command('concat', 'Concatenate files')
  .Args(z.tuple([
    z.string().describe('Output file').meta({ argName: 'output' }),
  ]).rest(z.string()))
  .Run(({ Params, Log }) => {
    const output = Params.Arg(0);
    const inputs = Params.Args.slice(1);  // Remaining args
    Log.Info(`Concatenating ${inputs.length} files to ${output}`);
  });
```

---

## Defining Flags

### Boolean Flags

```typescript
.Flags(z.object({
  verbose: z.boolean().optional().describe('Enable verbose output'),
  force: z.boolean().optional().describe('Skip confirmation'),
  quiet: z.boolean().optional().describe('Suppress output'),
}))
```

Usage:
```bash
mycli deploy --verbose --force
mycli deploy --no-verbose  # Explicitly false
```

### String Flags

```typescript
.Flags(z.object({
  env: z.string().default('development').describe('Environment'),
  config: z.string().optional().describe('Config file path'),
}))
```

Usage:
```bash
mycli deploy --env=production
mycli deploy --env production
mycli deploy --config ./config.json
```

### Number Flags

```typescript
.Flags(z.object({
  port: z.coerce.number().default(3000).describe('Server port'),
  timeout: z.coerce.number().optional().describe('Timeout in seconds'),
  retries: z.coerce.number().min(0).max(10).default(3).describe('Retry count'),
}))
```

### Enum Flags

```typescript
.Flags(z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'text', 'table']).optional(),
}))
```

### Array Flags

```typescript
.Flags(z.object({
  include: z.array(z.string()).optional().describe('Files to include'),
  exclude: z.array(z.string()).optional().describe('Files to exclude'),
}))
```

Usage:
```bash
mycli build --include=src --include=lib --exclude=test
```

---

## Custom Params Classes

For complex argument logic, create a custom params class:

```typescript
import { CommandParams } from '@fathym/cli';
import { z } from 'zod';

// Define schemas
const ArgsSchema = z.tuple([
  z.string().optional().describe('Project name'),
]);

const FlagsSchema = z.object({
  template: z.string().optional(),
  force: z.boolean().optional(),
  outputDir: z.string().optional(),
});

// Create custom params class
class InitParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  /** Get project name with smart defaults */
  get ProjectName(): string {
    const arg = this.Arg(0);
    if (!arg || arg === '.') {
      // Use current directory name
      return Deno.cwd().split(/[\\/]/).pop() ?? 'project';
    }
    return arg;
  }

  /** Get template with default */
  get Template(): string {
    return this.Flag('template') ?? 'default';
  }

  /** Get output directory */
  get OutputDir(): string {
    return this.Flag('outputDir') ?? this.ProjectName;
  }

  /** Whether to skip confirmations */
  get Force(): boolean {
    return this.Flag('force') ?? false;
  }
}

// Use in command
export default Command('init', 'Initialize a new project')
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
import { CLIDFSContextManager } from '@fathym/cli';

Command('info', 'Show project info')
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const root = await Services.dfs.GetProjectDFS();
    Log.Info(`Project: ${root.Root}`);
  });
```

### Multiple Services

```typescript
.Services(async (ctx, ioc) => ({
  dfs: await ioc.Resolve(CLIDFSContextManager),
  config: await ioc.Resolve(ConfigService),
  api: await ioc.Resolve(APIClient),
}))
```

### Conditional Services

```typescript
.Services(async (ctx, ioc) => {
  const provider = ctx.Params.Flag('provider');

  return {
    deployer: provider === 'aws'
      ? await ioc.Resolve(AWSDeployer)
      : provider === 'gcp'
      ? await ioc.Resolve(GCPDeployer)
      : await ioc.Resolve(LocalDeployer),
  };
})
```

### Inline Services

```typescript
.Services(async (ctx) => ({
  // Create service with params
  builder: new ProjectBuilder({
    target: ctx.Params.Flag('target'),
    minify: ctx.Params.Flag('minify'),
  }),

  // Create temp resources
  tempDir: await Deno.makeTempDir(),
}))
```

---

## Command Lifecycle

### Init Phase

Use for validation and setup before the main logic:

```typescript
.Init(async ({ Params, Services, Log }) => {
  Log.Debug('Validating configuration...');

  // Check preconditions
  const config = await Services.config.load();
  if (!config.isValid) {
    throw new Error('Invalid configuration');
  }

  // Confirm destructive operations
  if (Params.Flag('env') === 'production' && !Params.Flag('force')) {
    const confirmed = await Services.prompt.confirm(
      'Deploy to production?'
    );
    if (!confirmed) {
      throw new Error('Deployment cancelled');
    }
  }
})
```

### Run Phase

The main execution logic:

```typescript
.Run(async ({ Params, Services, Log }) => {
  const env = Params.Flag('env');

  Log.Info(`Deploying to ${env}...`);

  const result = await Services.deployer.deploy({
    environment: env,
    force: Params.Flag('force'),
  });

  Log.Success(`Deployed version ${result.version}`);
})
```

### Dry Run Phase

Preview mode that shows what would happen:

```typescript
.DryRun(async ({ Params, Services, Log }) => {
  const env = Params.Flag('env');

  Log.Info(`Would deploy to ${env}`);

  const changes = await Services.deployer.preview();
  Log.Info('Changes that would be made:');
  changes.forEach(c => Log.Info(`  - ${c.type}: ${c.path}`));
})
```

### Cleanup Phase

Resource cleanup (runs even on error):

```typescript
.Cleanup(async ({ Services, Log }) => {
  // Clean up temp resources
  if (Services.tempDir) {
    try {
      await Deno.remove(Services.tempDir, { recursive: true });
      Log.Debug('Cleaned up temp directory');
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
.Run(async ({ Params, Log }) => {
  const file = Params.Arg(0);

  if (!await fileExists(file)) {
    throw new Error(`File not found: ${file}`);
  }

  // Continue processing...
})
```

### Error Recovery

```typescript
.Run(async ({ Params, Log, Services }) => {
  const maxRetries = Params.Flag('retries');
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await Services.api.deploy();
      Log.Success('Deployment successful');
      return;
    } catch (error) {
      lastError = error;
      Log.Warn(`Attempt ${i + 1} failed: ${error.message}`);
      await delay(1000 * (i + 1));  // Exponential backoff
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
})
```

### Validation Errors

```typescript
.Run(({ Params, Log }) => {
  const email = Params.Flag('email');

  if (!email?.includes('@')) {
    throw new Error('Invalid email format');
  }

  // Process valid email...
})
```

---

## Subcommands

### Parent Command

```typescript
// commands/db.ts
export default Command('db', 'Database operations')
  .Run(({ Log }) => {
    Log.Info('Available commands:');
    Log.Info('  db migrate    Run migrations');
    Log.Info('  db seed       Seed the database');
    Log.Info('  db reset      Reset the database');
  });
```

### Subcommands

```typescript
// commands/db-migrate.ts
export default Command('db migrate', 'Run database migrations')
  .Flags(z.object({
    steps: z.number().optional().describe('Number of migrations'),
  }))
  .Run(async ({ Params, Log }) => {
    const steps = Params.Flag('steps');
    Log.Info(`Running ${steps ?? 'all'} migrations...`);
  });

// commands/db-seed.ts
export default Command('db seed', 'Seed the database')
  .Run(({ Log }) => {
    Log.Info('Seeding database...');
  });
```

### Configuration

```json
{
  "commands": {
    "db": "./commands/db.ts",
    "db migrate": "./commands/db-migrate.ts",
    "db seed": "./commands/db-seed.ts",
    "db reset": "./commands/db-reset.ts"
  }
}
```

---

## Best Practices

### 1. Keep Commands Focused

Each command should do one thing well:

```typescript
// Good
Command('build', 'Build the project')
Command('test', 'Run tests')
Command('deploy', 'Deploy the application')

// Avoid
Command('build-test-deploy', 'Do everything')
```

### 2. Use Descriptive Names

```typescript
// Good
.Flags(z.object({
  outputPath: z.string().describe('Output file path'),
  skipTests: z.boolean().describe('Skip running tests'),
}))

// Avoid
.Flags(z.object({
  o: z.string(),
  s: z.boolean(),
}))
```

### 3. Provide Defaults

```typescript
.Flags(z.object({
  env: z.string().default('development'),
  port: z.number().default(3000),
  retries: z.number().default(3),
}))
```

### 4. Validate Early

```typescript
.Init(async ({ Params }) => {
  // Validate before expensive operations
  const config = await loadConfig();
  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mycli config set apiKey');
  }
})
```

### 5. Use Dry Run

```typescript
.DryRun(async ({ Log }) => {
  Log.Info('Would perform the following actions:');
  // Show what would happen
})
.Run(async ({ Log }) => {
  Log.Info('Performing actions...');
  // Actually do it
})
```

---

## Related

- [Commands Concept](../concepts/commands.md) - Lifecycle details
- [Fluent API Concept](../concepts/fluent-api.md) - Builder pattern
- [Testing Commands](./testing-commands.md) - Test your commands

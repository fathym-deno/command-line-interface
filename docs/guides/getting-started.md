---
FrontmatterVersion: 1
DocumentType: Guide
Title: Getting Started with @fathym/cli
Summary: Build your first CLI application with the Fathym CLI framework.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Building Commands
    Path: ./building-commands.md
---

# Getting Started with @fathym/cli

This guide walks you through creating your first CLI application using the Fathym CLI framework.

## Prerequisites

- [Deno](https://deno.land/) 1.40 or later
- Basic TypeScript knowledge

## Installation

Add the CLI framework to your project's `deno.json`:

```json
{
  "imports": {
    "@fathym/cli": "jsr:@fathym/cli@latest",
    "zod": "npm:zod@^3.22.0"
  }
}
```

## Project Structure

Create the following directory structure:

```
my-cli/
├── commands/
│   └── greet.ts
├── .cli.json
├── .cli.init.ts      # Optional: IoC service registration
├── deno.json
└── main.ts
```

## Step 1: Create the CLI Configuration

Create `.cli.json`:

```json
{
  "Name": "My CLI",
  "Tokens": ["mycli"],
  "Version": "1.0.0",
  "Commands": "./commands"
}
```

This configuration tells the CLI framework:
- **Name**: Display name shown in help output
- **Tokens**: Command names users type (e.g., `mycli greet`)
- **Version**: Semantic version for `--version` output
- **Commands**: Directory to scan for command files (auto-discovered)

## Step 2: Create Your First Command

Create `commands/greet.ts`:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

// 1. Define schemas for arguments and flags
const ArgsSchema = z.tuple([
  z.string().optional().describe('Name to greet').meta({ argName: 'name' }),
]);

const FlagsSchema = z.object({
  loud: z.boolean().optional().describe('Shout the greeting'),
});

// 2. Create a custom Params class with getters
// This encapsulates defaults and business logic
class GreetParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Name(): string {
    return this.Arg(0) ?? 'World';
  }

  get IsLoud(): boolean {
    return this.Flag('loud') ?? false;
  }
}

// 3. Build the command with all required parts
export default Command('greet', 'Greet someone by name')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    const message = `Hello, ${Params.Name}!`;

    if (Params.IsLoud) {
      Log.Info(message.toUpperCase());
    } else {
      Log.Info(message);
    }
  });
```

> **Important:** The `Arg()` and `Flag()` methods are **protected** and can only be
> called from within your Params class getters. Access values via the public getters
> (`Params.Name`, `Params.IsLoud`) in your command handlers.

## Step 3: Create the Entry Point

Create `main.ts`:

```typescript
import { CLI } from '@fathym/cli';

const cli = new CLI();

if (import.meta.main) {
  await cli.RunFromArgs(Deno.args);
}
```

## Step 4: Run Your CLI

```bash
# Run the greet command
deno run -A main.ts greet
# Output: Hello, World!

# With a name argument
deno run -A main.ts greet Alice
# Output: Hello, Alice!

# With the loud flag
deno run -A main.ts greet Bob --loud
# Output: HELLO, BOB!

# Show help
deno run -A main.ts --help
```

## Step 5: Add a Deno Task

Update your `deno.json`:

```json
{
  "imports": {
    "@fathym/cli": "jsr:@fathym/cli@latest",
    "zod": "npm:zod@^3.22.0"
  },
  "tasks": {
    "cli": "deno run -A main.ts"
  }
}
```

Now you can run:

```bash
deno task cli greet Alice --loud
```

---

## Service Registration with .cli.init.ts

For CLIs that need shared services (API clients, configuration, utilities), create a
`.cli.init.ts` file at the project root. This function runs once before command execution.

Create `.cli.init.ts`:

```typescript
import type { IoCContainer } from '@fathym/cli';
import type { CLIInitFn } from '@fathym/cli';

// Define your service interface
export interface ConfigService {
  Get(key: string): string | undefined;
}

// Implementation
class EnvConfigService implements ConfigService {
  Get(key: string): string | undefined {
    return Deno.env.get(key);
  }
}

// Export the init function as default
export default ((ioc: IoCContainer, _config) => {
  // Register services in the IoC container
  ioc.Register(() => new EnvConfigService(), {
    Type: ioc.Symbol('ConfigService'),
  });
}) as CLIInitFn;
```

Use services in commands:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import type { IoCContainer } from '@fathym/cli';
import { z } from 'zod';
import type { ConfigService } from '../.cli.init.ts';

const ArgsSchema = z.tuple([z.string().describe('Variable name')]);
const FlagsSchema = z.object({});

class EnvParams extends CommandParams<z.infer<typeof ArgsSchema>, z.infer<typeof FlagsSchema>> {
  get Key(): string {
    return this.Arg(0)!;
  }
}

export default Command('env', 'Show environment variable')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(EnvParams)
  .Services(async (_ctx, ioc: IoCContainer) => ({
    config: await ioc.Resolve<ConfigService>(ioc.Symbol('ConfigService')),
  }))
  .Run(({ Params, Services, Log }) => {
    const value = Services.config.Get(Params.Key) ?? '(not set)';
    Log.Info(`${Params.Key}=${value}`);
  });
```

> **Note:** The `.cli.init.ts` file is automatically discovered when placed next to
> `.cli.json`. For testing, use `.WithInit(initFn)` on your test suite.

---

## Adding More Commands

### A Command with Services

Create `commands/info.ts`:

```typescript
import { Command, CommandParams, CLIDFSContextManager } from '@fathym/cli';
import type { IoCContainer } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([]);
const FlagsSchema = z.object({});

class InfoParams extends CommandParams<z.infer<typeof ArgsSchema>, z.infer<typeof FlagsSchema>> {}

export default Command('info', 'Show project information')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(InfoParams)
  .Services(async (_ctx, ioc: IoCContainer) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log, Config }) => {
    const projectDfs = await Services.dfs.GetProjectDFS();

    Log.Info(`CLI: ${Config.Name} v${Config.Version}`);
    Log.Info(`Project root: ${projectDfs.Root}`);
  });
```

Since commands are auto-discovered from the `./commands` directory, you don't need to update `.cli.json` when adding new command files. Just create the file in the `commands/` directory and it will be available automatically.

### Organizing Related Commands

Group related commands using directory structure. The command key is derived from the file path:

```
commands/
├── greet.ts           → mycli greet
├── info.ts            → mycli info
└── config/
    ├── .metadata.ts   → Group help for "config"
    ├── get.ts         → mycli config get
    └── set.ts         → mycli config set
```

Create `commands/config/.metadata.ts` for group help:

```typescript
import { CommandModuleMetadata } from '@fathym/cli';

export default {
  Name: 'config',
  Description: 'Manage configuration settings',
} as CommandModuleMetadata;
```

Create `commands/config/get.ts`:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([z.string().describe('Config key')]);
const FlagsSchema = z.object({});

class ConfigGetParams extends CommandParams<z.infer<typeof ArgsSchema>, z.infer<typeof FlagsSchema>> {
  get Key(): string {
    return this.Arg(0)!;
  }
}

// Display name is 'get', command key is 'config/get' (from file path)
export default Command('get', 'Get a configuration value')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(ConfigGetParams)
  .Run(({ Params, Log }) => {
    const value = Deno.env.get(Params.Key) ?? '(not set)';
    Log.Info(`${Params.Key}=${value}`);
  });
```

> **Important:** The command key (`config/get`) comes from the file path, not the
> first parameter to `Command()`. The first parameter is the display name shown in help.

---

## Adding Tests

Create `tests/intents/greet.intents.ts`:

```typescript
import { CommandIntents } from '@fathym/cli';
import GreetCommand from '../../commands/greet.ts';
import initFn from '../../.cli.init.ts';

const cmd = GreetCommand.Build();  // Important: call .Build() for fluent commands
const configPath = import.meta.resolve('../../.cli.json');

CommandIntents('Greet Command', cmd, configPath)
  .WithInit(initFn)  // Optional: register services for testing
  .Intent('greets with default name', (int) =>
    int
      .Args([undefined])
      .Flags({})
      .ExpectLogs('Hello, World!')
      .ExpectExit(0))
  .Intent('greets by name', (int) =>
    int
      .Args(['Alice'])
      .Flags({})
      .ExpectLogs('Hello, Alice!')
      .ExpectExit(0))
  .Intent('greets loudly', (int) =>
    int
      .Args(['Bob'])
      .Flags({ loud: true })
      .ExpectLogs('HELLO, BOB!')
      .ExpectExit(0))
  .Run();
```

> **Note:** When testing fluent commands created with `Command()`, you must call
> `.Build()` to get the CommandModule before passing it to `CommandIntents`.
>
> **Tip:** If you encounter type errors with the testing API, you may need to use
> type assertions (e.g., `cmd as any`) due to TypeScript's strict generic inference.

Create `tests/.tests.ts`:

```typescript
import './intents/greet.intents.ts';
```

Update `deno.json`:

```json
{
  "tasks": {
    "cli": "deno run -A main.ts",
    "test": "deno test -A ./tests/.tests.ts"
  }
}
```

Run tests:

```bash
deno task test
```

---

## Next Steps

1. **Learn command patterns** -> [Building Commands Guide](./building-commands.md)
2. **Add template scaffolding** -> [Template Scaffolding Guide](./scaffolding.md)
3. **Test your commands** -> [Testing Commands Guide](./testing-commands.md)
4. **Compile for distribution** -> [Compiling CLIs Guide](./embedded-cli.md)

---

## Quick Reference

### Command Structure

```typescript
// First param is display name (shown in help), NOT the command key
// Command key comes from file path: commands/deploy.ts → 'deploy'
Command('name', 'description')
  .Args(argsSchema)        // Positional arguments (Zod tuple)
  .Flags(flagsSchema)      // Flags/options (Zod object)
  .Params(ParamsClass)     // Custom params accessor (REQUIRED)
  .Services(servicesFn)    // Dependency injection
  .Init(initFn)            // Initialization
  .Run(runFn)              // Main logic
  .DryRun(dryRunFn)        // Preview mode
  .Cleanup(cleanupFn);     // Cleanup
```

### The Params Pattern

```typescript
// 1. Define schemas
const ArgsSchema = z.tuple([z.string().optional()]);
const FlagsSchema = z.object({ verbose: z.boolean().optional() });

// 2. Create Params class with getters
class MyParams extends CommandParams<
  z.infer<typeof ArgsSchema>,
  z.infer<typeof FlagsSchema>
> {
  get Name(): string {
    return this.Arg(0) ?? 'default';  // Protected method in getter
  }
  get Verbose(): boolean {
    return this.Flag('verbose') ?? false;  // Protected method in getter
  }
}

// 3. Use in command
Command('my-cmd', 'Description')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(MyParams)          // REQUIRED!
  .Run(({ Params }) => {
    console.log(Params.Name);     // Access via getter
    console.log(Params.Verbose);  // Access via getter
  });
```

### Flag Types

```typescript
z.object({
  // Boolean: --verbose or --no-verbose
  verbose: z.boolean().optional(),

  // String: --env=production
  env: z.string().default('development'),

  // Number: --count=5
  count: z.number().optional(),

  // Enum: --level=info
  level: z.enum(['debug', 'info', 'warn', 'error']),

  // Array: --tag=one --tag=two
  tags: z.array(z.string()).optional(),
})
```

### Logging

```typescript
.Run(({ Log }) => {
  Log.Info('Standard output');   // Default level
  Log.Warn('Warning message');   // Highlighted
  Log.Error('Error message');    // Error output
  Log.Success('Success!');       // Success indicator
});
```

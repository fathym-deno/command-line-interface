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
├── deno.json
└── main.ts
```

## Step 1: Create the CLI Configuration

Create `.cli.json`:

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "commands": {
    "greet": "./commands/greet.ts"
  }
}
```

## Step 2: Create Your First Command

Create `commands/greet.ts`:

```typescript
import { Command } from '@fathym/cli';
import { z } from 'zod';

export default Command('greet', 'Greet someone by name')
  .Args(z.tuple([
    z.string().optional().describe('Name to greet').meta({ argName: 'name' }),
  ]))
  .Flags(z.object({
    loud: z.boolean().optional().describe('Shout the greeting'),
  }))
  .Run(({ Params, Log }) => {
    const name = Params.Arg(0) ?? 'World';
    const message = `Hello, ${name}!`;

    if (Params.Flag('loud')) {
      Log.Info(message.toUpperCase());
    } else {
      Log.Info(message);
    }
  });
```

## Step 3: Create the Entry Point

Create `main.ts`:

```typescript
import { CLI } from '@fathym/cli';

const cli = new CLI({
  name: 'my-cli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
});

if (import.meta.main) {
  const exitCode = await cli.Run(Deno.args);
  Deno.exit(exitCode);
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

## Adding More Commands

### A Command with Services

Create `commands/info.ts`:

```typescript
import { Command, CLIDFSContextManager } from '@fathym/cli';

export default Command('info', 'Show project information')
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log, Config }) => {
    const projectDfs = await Services.dfs.GetProjectDFS();

    Log.Info(`CLI: ${Config.name} v${Config.version}`);
    Log.Info(`Project root: ${projectDfs.Root}`);
  });
```

Update `.cli.json`:

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "commands": {
    "greet": "./commands/greet.ts",
    "info": "./commands/info.ts"
  }
}
```

### A Command with Subcommands

Create `commands/config.ts`:

```typescript
import { Command } from '@fathym/cli';

export default Command('config', 'Manage configuration')
  .Run(({ Log }) => {
    Log.Info('Available subcommands:');
    Log.Info('  config get <key>    Get a config value');
    Log.Info('  config set <key>    Set a config value');
  });
```

Create `commands/config-get.ts`:

```typescript
import { Command } from '@fathym/cli';
import { z } from 'zod';

export default Command('config get', 'Get a configuration value')
  .Args(z.tuple([z.string().describe('Config key')]))
  .Run(({ Params, Log }) => {
    const key = Params.Arg(0);
    const value = Deno.env.get(key) ?? '(not set)';
    Log.Info(`${key}=${value}`);
  });
```

Update `.cli.json`:

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "commands": {
    "greet": "./commands/greet.ts",
    "info": "./commands/info.ts",
    "config": "./commands/config.ts",
    "config get": "./commands/config-get.ts"
  }
}
```

---

## Adding Tests

Create `tests/intents/greet.intents.ts`:

```typescript
import { CommandIntent } from '@fathym/cli';
import GreetCommand from '../../commands/greet.ts';

const configPath = import.meta.resolve('../../.cli.json');

CommandIntent('greets with default name', GreetCommand, configPath)
  .ExpectLogs('Hello, World!')
  .ExpectExit(0)
  .Run();

CommandIntent('greets by name', GreetCommand, configPath)
  .Args(['Alice'])
  .ExpectLogs('Hello, Alice!')
  .ExpectExit(0)
  .Run();

CommandIntent('greets loudly', GreetCommand, configPath)
  .Args(['Bob'])
  .Flags({ loud: true })
  .ExpectLogs('HELLO, BOB!')
  .ExpectExit(0)
  .Run();
```

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

1. **Learn command patterns** → [Building Commands Guide](./building-commands.md)
2. **Add template scaffolding** → [Template Scaffolding Guide](./scaffolding.md)
3. **Test your commands** → [Testing Commands Guide](./testing-commands.md)
4. **Compile for distribution** → [Compiling CLIs Guide](./embedded-cli.md)

---

## Quick Reference

### Command Structure

```typescript
Command('key', 'description')
  .Args(argsSchema)        // Positional arguments
  .Flags(flagsSchema)      // Flags/options
  .Params(ParamsClass)     // Custom params accessor
  .Services(servicesFn)    // Dependency injection
  .Init(initFn)            // Initialization
  .Run(runFn)              // Main logic
  .DryRun(dryRunFn)        // Preview mode
  .Cleanup(cleanupFn);     // Cleanup
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
  Log.Debug('Detailed info');    // Only with LOG_LEVEL=debug
  Log.Info('Standard output');   // Default level
  Log.Warn('Warning message');   // Highlighted
  Log.Error('Error message');    // Error output
  Log.Success('Success!');       // Success indicator
});
```

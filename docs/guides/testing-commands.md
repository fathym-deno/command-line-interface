---
FrontmatterVersion: 1
DocumentType: Guide
Title: Testing Commands
Summary: Intent-based testing framework for CLI commands.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Testing API
    Path: ../api/testing.md
---

# Testing Commands

This guide covers the intent-based testing framework for CLI commands.

## Overview

The CLI framework provides `CommandIntents` (suite-based) and `CommandIntent` (single test) for declarative testing without invoking the full CLI.

**Use `CommandIntents` for most cases** - it provides better organization, shared setup, and groups related tests.

```typescript
import { CommandIntents } from '@fathym/cli';
import GreetCommand from '../commands/greet.ts';
import initFn from '../.cli.init.ts';

const cmd = GreetCommand.Build();  // Important: call .Build()
const configPath = import.meta.resolve('../.cli.json');

CommandIntents('Greet Command', cmd, configPath)
  .WithInit(initFn)
  .Intent('greets with default name', (int) =>
    int.Args([undefined]).Flags({}).ExpectLogs('Hello, World!').ExpectExit(0))
  .Intent('greets by name', (int) =>
    int.Args(['Alice']).Flags({}).ExpectLogs('Hello, Alice!').ExpectExit(0))
  .Intent('greets loudly', (int) =>
    int.Args(['World']).Flags({ loud: true }).ExpectLogs('HELLO, WORLD!').ExpectExit(0))
  .Run();
```

---

## Setting Up Tests

### Project Structure

```
my-cli/
├── commands/
│   ├── greet.ts
│   └── deploy.ts
├── tests/
│   ├── intents/
│   │   ├── greet.intents.ts
│   │   └── deploy.intents.ts
│   └── .tests.ts
├── .cli.json
├── .cli.init.ts
└── deno.json
```

### Test Entry Point

Create `tests/.tests.ts`:

```typescript
// Import all intent test files
import './intents/greet.intents.ts';
import './intents/deploy.intents.ts';
```

### Deno Task

Add to `deno.json`:

```json
{
  "tasks": {
    "test": "deno test -A ./tests/.tests.ts"
  }
}
```

### Run Tests

```bash
deno task test
```

---

## Suite-Based Testing with CommandIntents

### Basic Suite

```typescript
// tests/intents/greet.intents.ts
import { CommandIntents } from '@fathym/cli';
import GreetCommand from '../../commands/greet.ts';
import initFn from '../../.cli.init.ts';

const cmd = GreetCommand.Build();
const configPath = import.meta.resolve('../../.cli.json');

CommandIntents('Greet Command', cmd, configPath)
  .WithInit(initFn)
  .Intent('greets with default', (int) =>
    int.Args([undefined]).Flags({}).ExpectLogs('Hello, World!').ExpectExit(0))
  .Intent('greets by name', (int) =>
    int.Args(['Alice']).Flags({}).ExpectLogs('Hello, Alice!').ExpectExit(0))
  .Run();
```

### With Setup

Use `.BeforeAll()` for setup that runs before all tests in the suite:

```typescript
CommandIntents('Init Command', InitCommand.Build(), configPath)
  .WithInit(initFn)
  .BeforeAll(async () => {
    // Clean up temp directory before tests
    await Deno.remove('./tests/.temp', { recursive: true }).catch(() => {});
  })
  .Intent('creates project structure', (int) =>
    int.Args(['my-project']).Flags({}).ExpectLogs('Project initialized!').ExpectExit(0))
  .Intent('fails on existing directory', (int) =>
    int.Args(['existing-project']).Flags({}).ExpectExit(1))
  .Run();
```

### With Flags

```typescript
CommandIntents('Deploy Command', DeployCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('deploys to development by default', (int) =>
    int.Args([]).Flags({}).ExpectLogs('Deploying to development...').ExpectExit(0))
  .Intent('deploys to staging', (int) =>
    int.Args([]).Flags({ env: 'staging' }).ExpectLogs('Deploying to staging...').ExpectExit(0))
  .Intent('deploys to production with force', (int) =>
    int
      .Args([])
      .Flags({ env: 'production', force: true })
      .ExpectLogs('Deploying to production...', 'Deployment complete!')
      .ExpectExit(0))
  .Intent('sets replica count', (int) =>
    int.Args([]).Flags({ replicas: 3 }).ExpectLogs('Replicas: 3').ExpectExit(0))
  .Run();
```

### Testing Error Cases

Test failure scenarios using `ExpectExit(1)`:

```typescript
CommandIntents('Validate Command', ValidateCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('succeeds with valid input', (int) =>
    int.Args(['valid-input']).Flags({}).ExpectLogs('Validation passed').ExpectExit(0))
  .Intent('fails with empty input', (int) =>
    int.Args(['']).Flags({}).ExpectExit(1))
  .Intent('fails with invalid format', (int) =>
    int.Args(['invalid@#$']).Flags({}).ExpectExit(1))
  .Run();
```

---

## Single Test with CommandIntent

Use `CommandIntent` when you only need one test case:

```typescript
import { CommandIntent } from '@fathym/cli';
import VersionCommand from '../../commands/version.ts';

const configPath = import.meta.resolve('../../.cli.json');

CommandIntent('shows version info', VersionCommand.Build(), configPath)
  .Args([])
  .Flags({})
  .ExpectLogs('v1.0.0')
  .ExpectExit(0)
  .Run();
```

> **Important:** Always call `.Build()` on fluent commands before passing to `CommandIntent`.

---

## Assertions

### ExpectExit

Assert the expected exit code:

```typescript
// Success
.Intent('succeeds', (int) =>
  int.Args([]).Flags({}).ExpectExit(0))

// Failure
.Intent('fails on error', (int) =>
  int.Args(['invalid']).Flags({}).ExpectExit(1))
```

### ExpectLogs

Assert log output contains messages in order:

```typescript
.Intent('logs progress', (int) =>
  int
    .Args([])
    .Flags({})
    .ExpectLogs(
      'Starting build...',
      'Compiling TypeScript...',
      'Bundling...',
      'Build complete!',
    )
    .ExpectExit(0))
```

Multiple messages are checked in sequence within the log output.

---

## Testing Patterns

### Testing Default Values

```typescript
CommandIntents('Serve Command', ServeCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('uses default port', (int) =>
    int.Args([]).Flags({}).ExpectLogs('Starting on port 3000').ExpectExit(0))
  .Intent('uses custom port', (int) =>
    int.Args([]).Flags({ port: 8080 }).ExpectLogs('Starting on port 8080').ExpectExit(0))
  .Run();
```

### Testing Dry Run

```typescript
CommandIntents('Delete Command', DeleteCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('dry run shows preview', (int) =>
    int
      .Args(['important-file.txt'])
      .Flags({ dryRun: true })
      .ExpectLogs('Would delete: important-file.txt')
      .ExpectExit(0))
  .Intent('actually deletes', (int) =>
    int
      .Args(['temp-file.txt'])
      .Flags({})
      .ExpectLogs('Deleted: temp-file.txt')
      .ExpectExit(0))
  .Run();
```

### Testing Subcommands

```typescript
// Test parent command shows help
CommandIntents('Db Command', DbCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('shows subcommand help', (int) =>
    int
      .Args([])
      .Flags({})
      .ExpectLogs('Available commands:', 'db migrate', 'db seed')
      .ExpectExit(0))
  .Run();

// Test subcommand separately
CommandIntents('Db Migrate Command', DbMigrateCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('runs migrations', (int) =>
    int.Args([]).Flags({ steps: 5 }).ExpectLogs('Running 5 migrations').ExpectExit(0))
  .Intent('runs all migrations by default', (int) =>
    int.Args([]).Flags({}).ExpectLogs('Running all migrations').ExpectExit(0))
  .Run();
```

---

## Test Organization

### By Command (Recommended)

```
tests/intents/
├── greet.intents.ts
├── deploy.intents.ts
├── init.intents.ts
├── db-migrate.intents.ts
└── db-seed.intents.ts
```

### By Feature

```
tests/intents/
├── auth/
│   ├── login.intents.ts
│   ├── logout.intents.ts
│   └── register.intents.ts
├── deploy/
│   ├── deploy.intents.ts
│   └── rollback.intents.ts
└── config/
    ├── get.intents.ts
    └── set.intents.ts
```

### Entry Point

```typescript
// tests/.tests.ts
// Group by feature
import './intents/auth/login.intents.ts';
import './intents/auth/logout.intents.ts';
import './intents/auth/register.intents.ts';

import './intents/deploy/deploy.intents.ts';
import './intents/deploy/rollback.intents.ts';

import './intents/config/get.intents.ts';
import './intents/config/set.intents.ts';
```

---

## Complete Example

```typescript
// tests/intents/deploy.intents.ts
import { CommandIntents } from '@fathym/cli';
import DeployCommand from '../../commands/deploy.ts';
import initFn from '../../.cli.init.ts';

const cmd = DeployCommand.Build();
const configPath = import.meta.resolve('../../.cli.json');

CommandIntents('Deploy Command', cmd, configPath)
  .WithInit(initFn)
  .BeforeAll(async () => {
    // Setup: ensure clean state
    await Deno.remove('./tests/.deploy-temp', { recursive: true }).catch(() => {});
  })
  // Happy path tests
  .Intent('deploys to development by default', (int) =>
    int
      .Args([])
      .Flags({})
      .ExpectLogs('Deploying to development...')
      .ExpectExit(0))
  .Intent('deploys to staging', (int) =>
    int
      .Args([])
      .Flags({ env: 'staging' })
      .ExpectLogs('Deploying to staging...')
      .ExpectExit(0))
  .Intent('deploys to production with force', (int) =>
    int
      .Args([])
      .Flags({ env: 'production', force: true })
      .ExpectLogs('Deploying to production...', 'Deployment complete!')
      .ExpectExit(0))
  // Dry run tests
  .Intent('dry run shows changes', (int) =>
    int
      .Args([])
      .Flags({ env: 'staging', dryRun: true })
      .ExpectLogs('Would deploy to staging')
      .ExpectExit(0))
  // Error cases
  .Intent('fails without confirmation for production', (int) =>
    int
      .Args([])
      .Flags({ env: 'production' })  // No force flag
      .ExpectExit(1))
  .Intent('fails with invalid environment', (int) =>
    int
      .Args([])
      .Flags({ env: 'invalid' })
      .ExpectExit(1))
  // Edge cases
  .Intent('handles empty app name', (int) =>
    int
      .Args([''])
      .Flags({})
      .ExpectExit(1))
  .Intent('handles special characters in app name', (int) =>
    int
      .Args(['my-app_v2.0'])
      .Flags({})
      .ExpectLogs('Deploying my-app_v2.0')
      .ExpectExit(0))
  .Run();
```

---

## Debugging Tests

### Run Single Test File

```bash
deno test -A ./tests/intents/greet.intents.ts
```

### Filter Tests by Name

```bash
deno test -A --filter "greets loudly" ./tests/.tests.ts
```

### Verbose Output

```bash
deno test -A --allow-env ./tests/.tests.ts
```

---

## When to Use Each API

| Scenario | API | Reason |
|----------|-----|--------|
| Multiple tests for one command | `CommandIntents` | Shared setup, organized suite |
| Single smoke test | `CommandIntent` | Simple, standalone |
| Tests need shared initialization | `CommandIntents` | `.WithInit()` and `.BeforeAll()` |
| Quick sanity check | `CommandIntent` | Minimal boilerplate |

---

## Related

- [Testing API Reference](../api/testing.md) - Full API details
- [Building Commands](./building-commands.md) - Command patterns
- [Commands Concept](../concepts/commands.md) - Lifecycle

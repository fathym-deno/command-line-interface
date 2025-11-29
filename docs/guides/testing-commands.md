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

The CLI framework provides `CommandIntent`, a declarative testing API that lets you test commands without invoking the full CLI.

```typescript
import { CommandIntent } from '@fathym/cli';
import GreetCommand from '../commands/greet.ts';

CommandIntent('greets by name', GreetCommand, import.meta.resolve('../.cli.json'))
  .Args(['Alice'])
  .ExpectLogs('Hello, Alice!')
  .ExpectExit(0)
  .Run();
```

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

## Writing Intent Tests

### Basic Test

```typescript
// tests/intents/greet.intents.ts
import { CommandIntent } from '@fathym/cli';
import GreetCommand from '../../commands/greet.ts';

const configPath = import.meta.resolve('../../.cli.json');

CommandIntent('greets with default', GreetCommand, configPath)
  .ExpectLogs('Hello, World!')
  .ExpectExit(0)
  .Run();
```

### With Arguments

```typescript
CommandIntent('greets by name', GreetCommand, configPath)
  .Args(['Alice'])
  .ExpectLogs('Hello, Alice!')
  .ExpectExit(0)
  .Run();

CommandIntent('handles multiple names', GreetCommand, configPath)
  .Args(['Alice', 'Bob'])
  .ExpectLogs('Hello, Alice and Bob!')
  .ExpectExit(0)
  .Run();
```

### With Flags

```typescript
CommandIntent('greets loudly', GreetCommand, configPath)
  .Args(['World'])
  .Flags({ loud: true })
  .ExpectLogs('HELLO, WORLD!')
  .ExpectExit(0)
  .Run();

CommandIntent('respects quiet mode', GreetCommand, configPath)
  .Flags({ quiet: true })
  .ExpectLogs()  // No output expected
  .ExpectExit(0)
  .Run();
```

### With Combined Args and Flags

```typescript
CommandIntent('deploys to staging', DeployCommand, configPath)
  .Args(['my-app'])
  .Flags({
    env: 'staging',
    force: true,
    replicas: 3,
  })
  .ExpectLogs(
    'Deploying my-app to staging...',
    'Replicas: 3',
    'Deployment complete!',
  )
  .ExpectExit(0)
  .Run();
```

---

## Assertions

### ExpectExit

Assert the expected exit code:

```typescript
// Success
CommandIntent('succeeds', MyCommand, configPath)
  .ExpectExit(0)
  .Run();

// Failure
CommandIntent('fails on error', MyCommand, configPath)
  .Args(['invalid'])
  .ExpectExit(1)
  .Run();
```

### ExpectLogs

Assert log output contains messages in order:

```typescript
CommandIntent('logs progress', BuildCommand, configPath)
  .ExpectLogs(
    'Starting build...',
    'Compiling TypeScript...',
    'Bundling...',
    'Build complete!',
  )
  .ExpectExit(0)
  .Run();
```

### ExpectLogsContaining

Assert log output contains substrings (any order):

```typescript
CommandIntent('shows version info', VersionCommand, configPath)
  .ExpectLogsContaining('v1.0.0', 'CLI', 'Deno')
  .ExpectExit(0)
  .Run();
```

### ExpectError

Assert the command throws an error:

```typescript
// Match exact message
CommandIntent('throws on missing file', ReadCommand, configPath)
  .Args(['nonexistent.txt'])
  .ExpectError('File not found')
  .Run();

// Match with regex
CommandIntent('validates email format', SendCommand, configPath)
  .Flags({ email: 'invalid' })
  .ExpectError(/Invalid email/)
  .Run();
```

### ExpectNoError

Assert no exception is thrown:

```typescript
CommandIntent('handles edge case', EdgeCaseCommand, configPath)
  .Args(['edge-input'])
  .ExpectNoError()
  .ExpectExit(0)
  .Run();
```

---

## Testing Patterns

### Testing Default Values

```typescript
CommandIntent('uses default port', ServeCommand, configPath)
  // No port flag provided
  .ExpectLogs('Starting on port 3000')
  .ExpectExit(0)
  .Run();

CommandIntent('uses custom port', ServeCommand, configPath)
  .Flags({ port: 8080 })
  .ExpectLogs('Starting on port 8080')
  .ExpectExit(0)
  .Run();
```

### Testing Validation

```typescript
CommandIntent('rejects invalid input', ValidateCommand, configPath)
  .Args([''])
  .ExpectError('Input cannot be empty')
  .Run();

CommandIntent('rejects out of range', CountCommand, configPath)
  .Flags({ count: 100 })
  .ExpectError('Count must be between 1 and 10')
  .Run();
```

### Testing Dry Run

```typescript
CommandIntent('dry run shows preview', DeleteCommand, configPath)
  .Args(['important-file.txt'])
  .Flags({ dryRun: true })
  .ExpectLogs('Would delete: important-file.txt')
  .ExpectNoError()
  .ExpectExit(0)
  .Run();
```

### Testing Subcommands

```typescript
// Parent command
CommandIntent('shows subcommand help', DbCommand, configPath)
  .ExpectLogs('Available commands:', 'db migrate', 'db seed')
  .ExpectExit(0)
  .Run();

// Subcommand
CommandIntent('runs migrations', DbMigrateCommand, configPath)
  .Flags({ steps: 5 })
  .ExpectLogs('Running 5 migrations')
  .ExpectExit(0)
  .Run();
```

---

## Testing with Mocks

### Mocking Services

For commands that use injected services, you may need to mock them:

```typescript
// Create mock service
const mockDeployer = {
  deploy: () => Promise.resolve({ version: '1.0.0' }),
  preview: () => Promise.resolve([
    { type: 'create', path: '/app/new.ts' },
  ]),
};

CommandIntent('uses mock deployer', DeployCommand, configPath)
  .WithServices({ deployer: mockDeployer })
  .Flags({ env: 'staging' })
  .ExpectLogs('Deployed version 1.0.0')
  .Run();
```

### Mocking DFS

For file system operations:

```typescript
import { MemoryDFSFileHandler } from '@fathym/dfs/handlers';

const mockDfs = new MemoryDFSFileHandler({});

// Pre-populate files
await mockDfs.WriteFile(
  'config.json',
  createStream('{"key": "value"}'),
);

CommandIntent('reads config', ConfigCommand, configPath)
  .WithDFS(mockDfs)
  .ExpectLogs('Config loaded: key=value')
  .Run();
```

---

## Test Organization

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

### By Command

```
tests/intents/
├── greet.intents.ts
├── deploy.intents.ts
├── config-get.intents.ts
├── config-set.intents.ts
└── init.intents.ts
```

### Entry Point

```typescript
// tests/.tests.ts
// Auth commands
import './intents/auth/login.intents.ts';
import './intents/auth/logout.intents.ts';
import './intents/auth/register.intents.ts';

// Deploy commands
import './intents/deploy/deploy.intents.ts';
import './intents/deploy/rollback.intents.ts';

// Config commands
import './intents/config/get.intents.ts';
import './intents/config/set.intents.ts';
```

---

## Complete Example

```typescript
// tests/intents/deploy.intents.ts
import { CommandIntent } from '@fathym/cli';
import DeployCommand from '../../commands/deploy.ts';

const configPath = import.meta.resolve('../../.cli.json');

// Happy path tests
CommandIntent('deploys to development by default', DeployCommand, configPath)
  .ExpectLogs('Deploying to development...')
  .ExpectExit(0)
  .Run();

CommandIntent('deploys to staging', DeployCommand, configPath)
  .Flags({ env: 'staging' })
  .ExpectLogs('Deploying to staging...')
  .ExpectExit(0)
  .Run();

CommandIntent('deploys to production with force', DeployCommand, configPath)
  .Flags({ env: 'production', force: true })
  .ExpectLogs(
    'Deploying to production...',
    'Deployment complete!',
  )
  .ExpectExit(0)
  .Run();

// Dry run tests
CommandIntent('dry run shows changes', DeployCommand, configPath)
  .Flags({ env: 'staging', dryRun: true })
  .ExpectLogs('Would deploy to staging')
  .ExpectExit(0)
  .Run();

// Error cases
CommandIntent('fails without confirmation for production', DeployCommand, configPath)
  .Flags({ env: 'production' })  // No force flag
  .ExpectError('Production deployment requires --force flag')
  .Run();

CommandIntent('fails with invalid environment', DeployCommand, configPath)
  .Flags({ env: 'invalid' })
  .ExpectError('Unknown environment: invalid')
  .Run();

// Edge cases
CommandIntent('handles empty app name', DeployCommand, configPath)
  .Args([''])
  .ExpectError('App name required')
  .Run();

CommandIntent('handles special characters in app name', DeployCommand, configPath)
  .Args(['my-app_v2.0'])
  .ExpectLogs('Deploying my-app_v2.0')
  .ExpectExit(0)
  .Run();
```

---

## Debugging Tests

### View Test Output

```bash
# Run with verbose output
LOG_LEVEL=debug deno task test
```

### Run Single Test

```bash
deno test -A ./tests/intents/greet.intents.ts
```

### Filter Tests

```bash
deno test -A --filter "greets loudly" ./tests/.tests.ts
```

---

## Related

- [Testing API Reference](../api/testing.md) - Full API
- [Building Commands](./building-commands.md) - Command patterns
- [Commands Concept](../concepts/commands.md) - Lifecycle

---
FrontmatterVersion: 1
DocumentType: API
Title: Testing API Reference
Summary: API reference for CommandIntent and intent-based testing framework.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Testing Commands Guide
    Path: ../guides/testing-commands.md
---

# Testing API Reference

API reference for the intent-based testing framework including `CommandIntent`, `CommandIntents`, and assertion helpers.

## Two Testing APIs

The framework provides two APIs for testing commands:

| API | Use Case | Pattern |
|-----|----------|---------|
| `CommandIntents` (plural) | Multiple tests for one command | Suite-based with `.Intent()` |
| `CommandIntent` (singular) | Single standalone test | One test per call |

**Recommendation:** Use `CommandIntents` for most cases. It provides better organization,
shared setup via `.BeforeAll()` and `.WithInit()`, and groups related tests.

---

## CommandIntents (Suite-Based)

The **preferred** way to test commands. Groups multiple intents for a single command.

```typescript
import { CommandIntents } from '@fathym/cli';
```

### Constructor

```typescript
function CommandIntents(
  suiteName: string,
  command: CommandModule,
  configPath: string | URL,
): CommandIntentsBuilder
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `suiteName` | `string` | Name of the test suite |
| `command` | `CommandModule` | Command to test (use `.Build()` for fluent commands) |
| `configPath` | `string \| URL` | Path to .cli.json |

**Returns:** A `CommandIntentsBuilder` for method chaining

### Complete Example

```typescript
import { CommandIntents } from '@fathym/cli';
import HelloCommand from '../commands/hello.ts';
import initFn from '../.cli.init.ts';

const cmd = HelloCommand.Build();  // Important: call .Build() for fluent commands
const origin = import.meta.resolve('../.cli.json');

CommandIntents('Hello Command Suite', cmd, origin)
  .WithInit(initFn)  // Optional: inject IoC initialization
  .BeforeAll(async () => {
    // Optional: setup before all tests
    await cleanupTempFiles();
  })
  .Intent('greets default world', (int) =>
    int
      .Args([undefined])  // No argument
      .Flags({})
      .ExpectLogs('👋 Hello, world')
      .ExpectExit(0))
  .Intent('greets a specific name', (int) =>
    int
      .Args(['Alice'])
      .Flags({})
      .ExpectLogs('👋 Hello, Alice')
      .ExpectExit(0))
  .Intent('greets loudly', (int) =>
    int
      .Args(['team'])
      .Flags({ loud: true })
      .ExpectLogs('👋 HELLO, TEAM')
      .ExpectExit(0))
  .Run();
```

### Suite Methods

#### WithInit

```typescript
WithInit(initFn: CLIInitFn): CommandIntentsBuilder
```

Inject an initialization function for IoC service registration.

```typescript
import initFn from '../.cli.init.ts';

CommandIntents('My Suite', cmd, origin)
  .WithInit(initFn)  // Registers services before each test
  .Intent(...)
  .Run();
```

#### BeforeAll

```typescript
BeforeAll(fn: () => Promise<void> | void): CommandIntentsBuilder
```

Run setup before all tests in the suite.

```typescript
CommandIntents('Init Suite', cmd, origin)
  .BeforeAll(async () => {
    await Deno.remove('./tests/.temp', { recursive: true }).catch(() => {});
  })
  .Intent(...)
  .Run();
```

#### Intent

```typescript
Intent(
  name: string,
  configure: (builder: IntentBuilder) => IntentBuilder
): CommandIntentsBuilder
```

Add a test intent to the suite.

```typescript
.Intent('test case name', (int) =>
  int
    .Args(['value'])
    .Flags({ flag: true })
    .ExpectLogs('expected output')
    .ExpectExit(0))
```

---

## CommandIntent (Single Test)

For standalone single tests. Use when you only need one test case.

```typescript
import { CommandIntent } from '@fathym/cli';
```

### Constructor

```typescript
function CommandIntent(
  description: string,
  command: CommandModule,
  configPath: string | URL,
): CommandIntentBuilder
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | `string` | Test description |
| `command` | `CommandModule` | Command to test |
| `configPath` | `string \| URL` | Path to .cli.json |

**Returns:** A `CommandIntentBuilder` for method chaining

```typescript
import { CommandIntent } from '@fathym/cli';
import GreetCommand from '../commands/greet.ts';

CommandIntent('greets the user', GreetCommand.Build(), import.meta.resolve('../.cli.json'))
  .Args(['World'])
  .ExpectLogs('Hello, World!')
  .ExpectExit(0)
  .Run();
```

> **Important:** When testing fluent commands (created with `Command()`), you must
> call `.Build()` on the command before passing it to `CommandIntent`.

---

## CommandIntentBuilder Methods

### Args

```typescript
Args(args: unknown[]): CommandIntentBuilder
```

Set positional arguments for the test.

| Parameter | Type | Description |
|-----------|------|-------------|
| `args` | `unknown[]` | Array of argument values |

**Returns:** Same builder (for chaining)

```typescript
CommandIntent('copies files', CopyCommand, configPath)
  .Args(['source.txt', 'dest.txt'])
  .Run();
```

### Flags

```typescript
Flags(flags: Record<string, unknown>): CommandIntentBuilder
```

Set flags for the test.

| Parameter | Type | Description |
|-----------|------|-------------|
| `flags` | `Record<string, unknown>` | Flag key-value pairs |

**Returns:** Same builder (for chaining)

```typescript
CommandIntent('deploys to staging', DeployCommand, configPath)
  .Flags({ env: 'staging', force: true })
  .Run();
```

### Combined Args and Flags

```typescript
CommandIntent('greets loudly', GreetCommand, configPath)
  .Args(['World'])
  .Flags({ loud: true })
  .ExpectLogs('HELLO, WORLD!')
  .Run();
```

---

## Expectations

### ExpectExit

```typescript
ExpectExit(code: number): CommandIntentBuilder
```

Assert the expected exit code.

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `number` | Expected exit code (0 = success) |

```typescript
CommandIntent('succeeds', MyCommand, configPath)
  .ExpectExit(0)
  .Run();

CommandIntent('fails on invalid input', MyCommand, configPath)
  .Args(['invalid'])
  .ExpectExit(1)
  .Run();
```

### ExpectLogs

```typescript
ExpectLogs(...messages: string[]): CommandIntentBuilder
```

Assert log output contains the specified messages (in order).

| Parameter | Type | Description |
|-----------|------|-------------|
| `messages` | `string[]` | Expected log messages |

```typescript
CommandIntent('logs progress', BuildCommand, configPath)
  .ExpectLogs(
    'Starting build...',
    'Compiling TypeScript...',
    'Build complete!',
  )
  .Run();
```

### ExpectLogsContaining

```typescript
ExpectLogsContaining(...substrings: string[]): CommandIntentBuilder
```

Assert log output contains substrings (in any order).

| Parameter | Type | Description |
|-----------|------|-------------|
| `substrings` | `string[]` | Substrings to find |

```typescript
CommandIntent('shows version', VersionCommand, configPath)
  .ExpectLogsContaining('v1.0.0', 'CLI')
  .Run();
```

### ExpectError

```typescript
ExpectError(message?: string | RegExp): CommandIntentBuilder
```

Assert the command throws an error.

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string \| RegExp?` | Optional error message match |

```typescript
CommandIntent('throws on missing file', ReadCommand, configPath)
  .Args(['nonexistent.txt'])
  .ExpectError('File not found')
  .Run();

CommandIntent('validates input', ValidateCommand, configPath)
  .Args(['invalid'])
  .ExpectError(/Invalid.*format/)
  .Run();
```

### ExpectNoError

```typescript
ExpectNoError(): CommandIntentBuilder
```

Assert the command completes without throwing.

```typescript
CommandIntent('runs without error', SafeCommand, configPath)
  .ExpectNoError()
  .ExpectExit(0)
  .Run();
```

---

## Execution

### Run

```typescript
Run(): void
```

Execute the intent test. Registers a `Deno.test()` with the configured assertions.

```typescript
CommandIntent('test description', MyCommand, configPath)
  .Args(['test'])
  .ExpectExit(0)
  .Run();  // Registers and runs the test
```

### RunAsync

```typescript
async RunAsync(): Promise<IntentResult>
```

Execute the intent test asynchronously without registering with Deno.test.

**Returns:** Test result object

```typescript
const result = await CommandIntent('test', MyCommand, configPath)
  .Args(['test'])
  .RunAsync();

console.log(result.exitCode);
console.log(result.logs);
```

---

## IntentResult

The result of running an intent test.

```typescript
interface IntentResult {
  /** Exit code from the command */
  exitCode: number;

  /** Captured log output */
  logs: string[];

  /** Error if command threw */
  error?: Error;

  /** Execution duration in ms */
  duration: number;
}
```

---

## Test File Organization

### Standard Structure

```
tests/
├── intents/
│   ├── greet.intents.ts
│   ├── deploy.intents.ts
│   └── init.intents.ts
└── .tests.ts
```

### Intent File Pattern

```typescript
// tests/intents/greet.intents.ts
import { CommandIntent } from '@fathym/cli';
import GreetCommand from '../../commands/greet.ts';

const configPath = import.meta.resolve('../../.cli.json');

CommandIntent('greets with default', GreetCommand, configPath)
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

### Test Entry Point

```typescript
// tests/.tests.ts
import './intents/greet.intents.ts';
import './intents/deploy.intents.ts';
import './intents/init.intents.ts';
```

Run tests:

```bash
deno task test
# or
deno test -A ./tests/.tests.ts
```

---

## Testing Patterns

### Testing Service Injection

```typescript
CommandIntent('uses injected service', MyCommand, configPath)
  .WithServices({
    myService: mockService,
  })
  .ExpectLogs('Service called')
  .Run();
```

### Testing DFS Operations

```typescript
CommandIntent('reads config file', ConfigCommand, configPath)
  .WithDFS(new MemoryDFSFileHandler({}))
  .Setup(async (dfs) => {
    await dfs.WriteFile('config.json', createStream('{"key": "value"}'));
  })
  .ExpectLogs('Config loaded')
  .Run();
```

### Testing Dry Run

```typescript
CommandIntent('dry run shows preview', DeleteCommand, configPath)
  .Args(['file.txt'])
  .Flags({ dryRun: true })
  .ExpectLogs('Would delete: file.txt')
  .ExpectExit(0)
  .Run();
```

### Testing Error Cases

```typescript
CommandIntent('handles missing argument', RequiredArgCommand, configPath)
  .Args([])  // Missing required arg
  .ExpectError('Missing required argument')
  .ExpectExit(1)
  .Run();

CommandIntent('handles invalid flag', TypedFlagCommand, configPath)
  .Flags({ count: 'not-a-number' })
  .ExpectError('Expected number')
  .ExpectExit(1)
  .Run();
```

---

## Assertions Reference

| Method | Description |
|--------|-------------|
| `ExpectExit(code)` | Assert exit code |
| `ExpectLogs(...msgs)` | Assert log messages (ordered) |
| `ExpectLogsContaining(...subs)` | Assert log contains substrings |
| `ExpectError(msg?)` | Assert command throws |
| `ExpectNoError()` | Assert no exception |

---

## Related

- [Testing Commands Guide](../guides/testing-commands.md) - Patterns and examples
- [Commands API](./commands.md) - Command runtime
- [Fluent API](./fluent.md) - Building testable commands

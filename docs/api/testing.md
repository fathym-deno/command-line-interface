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

#### WithServices (Suite-Level)

```typescript
WithServices(services: Partial<S>): CommandIntentsBuilder
```

Inject mock services for all tests in the suite. See [Service Mocking](#service-mocking) for details.

```typescript
CommandIntents('Deploy Suite', DeployCommand.Build(), configPath)
  .WithServices({
    deployer: mockDeployer,  // Applied to all intents
  })
  .Intent('deploys staging', (int) =>
    int.Args(['staging']).ExpectExit(0))
  .Run();
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

### WithInit

```typescript
WithInit(init: CLIInitFn): CommandIntentBuilder
```

Inject an initialization function for IoC service registration.

```typescript
import initFn from '../.cli.init.ts';

CommandIntent('test with services', MyCommand.Build(), configPath)
  .WithInit(initFn)
  .Args(['test'])
  .ExpectExit(0)
  .Run();
```

### WithServices

```typescript
WithServices(services: Partial<S>): CommandIntentBuilder
```

Inject mock services for the test. See [Service Mocking](#service-mocking) for details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `services` | `Partial<S>` | Partial map of services to mock |

**Returns:** Same builder (for chaining)

```typescript
CommandIntent('deploys with mock', DeployCommand.Build(), configPath)
  .WithServices({
    deployer: mockDeployer,
  })
  .Args(['staging'])
  .ExpectExit(0)
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

### Testing Dry Run

```typescript
CommandIntent('dry run shows preview', DeleteCommand, configPath)
  .Args(['file.txt'])
  .Flags({ dryRun: true })
  .ExpectLogs('Would delete: file.txt')
  .ExpectExit(0)
  .Run();
```

### Testing Different Input Combinations

```typescript
CommandIntents('Deploy Command', DeployCommand.Build(), configPath)
  .WithInit(initFn)
  .Intent('deploys to default environment', (int) =>
    int
      .Args([])
      .Flags({})
      .ExpectLogs('Deploying to production...')
      .ExpectExit(0))
  .Intent('deploys to staging', (int) =>
    int
      .Args([])
      .Flags({ env: 'staging' })
      .ExpectLogs('Deploying to staging...')
      .ExpectExit(0))
  .Intent('forces deployment', (int) =>
    int
      .Args([])
      .Flags({ force: true })
      .ExpectLogs('Force deploying...')
      .ExpectExit(0))
  .Run();
```

---

## Assertions Reference

| Method | Description |
|--------|-------------|
| `ExpectExit(code)` | Assert exit code |
| `ExpectLogs(...msgs)` | Assert log messages (ordered) |

---

## Service Mocking

The testing framework provides type-safe service mocking via `WithServices()`. Mock services
override real services during test execution, enabling isolated unit testing of command logic.

### Type Safety

Service types are inferred from the command's `.Services()` definition, providing autocomplete
and type checking for mock objects:

```typescript
// Command defines typed services
export default Command('deploy', 'Deploy application')
  .Params(DeployParams)
  .Services(async (ctx, ioc) => ({
    deployer: await ioc.Resolve<DeployerService>(ioc.Symbol('Deployer')),
    config: await ioc.Resolve<ConfigService>(ioc.Symbol('Config')),
  }))
  .Run(({ Services }) => {
    // Services.deployer and Services.config are typed
  });

// Tests get type-safe mocking
CommandIntent('deploys staging', DeployCommand.Build(), configPath)
  .WithServices({
    deployer: mockDeployer,  // TypeScript validates this matches DeployerService
    // config uses real implementation (partial mocking)
  })
  .Args(['staging'])
  .ExpectExit(0)
  .Run();
```

### Merge Order

Mock services are merged with real services in this order (later values override earlier):

1. **Built-in services** → Core CLI services (DFS, Resolver, etc.)
2. **WithInit services** → Services registered via `.cli.init.ts`
3. **Suite-level WithServices** → Applied to all intents in suite
4. **Intent-level WithServices** → Applied to individual intent

```typescript
CommandIntents('Deploy Suite', DeployCommand.Build(), configPath)
  .WithInit(initFn)
  .WithServices({
    deployer: suiteWideMock,  // Applied to all intents
  })
  .Intent('uses suite mock', (int) =>
    int.Args(['staging']).ExpectExit(0))
  .Intent('uses intent override', (int) =>
    int
      .WithServices({ deployer: intentSpecificMock })  // Overrides suite mock
      .Args(['prod'])
      .ExpectExit(0))
  .Run();
```

### Partial Mocking

You only need to mock the services your test cares about. Other services use their
real implementations:

```typescript
CommandIntent('deploys with mock deployer', DeployCommand.Build(), configPath)
  .WithServices({
    deployer: mockDeployer,  // Only mock the deployer
    // config, logger, etc. use real implementations
  })
  .ExpectExit(0)
  .Run();
```

### Common Patterns

#### Simple Mock Object

```typescript
const mockDeployer = {
  deploy: async (target: string) => ({ success: true, url: 'https://...' }),
  rollback: async () => {},
};

CommandIntent('deploys successfully', DeployCommand.Build(), configPath)
  .WithServices({ deployer: mockDeployer })
  .Args(['staging'])
  .ExpectLogs('Deployed to https://...')
  .ExpectExit(0)
  .Run();
```

#### Mocking Different Scenarios

```typescript
CommandIntents('Deploy Scenarios', DeployCommand.Build(), configPath)
  .Intent('handles success', (int) =>
    int
      .WithServices({
        deployer: { deploy: async () => ({ success: true }) },
      })
      .Args(['staging'])
      .ExpectExit(0))
  .Intent('handles failure', (int) =>
    int
      .WithServices({
        deployer: { deploy: async () => { throw new Error('Deploy failed'); } },
      })
      .Args(['staging'])
      .ExpectLogs('Deploy failed')
      .ExpectExit(1))
  .Run();
```

#### Stateful Mocks for Verification

```typescript
const calls: string[] = [];
const trackingMock = {
  deploy: async (target: string) => {
    calls.push(target);
    return { success: true };
  },
};

CommandIntent('calls deployer with correct target', DeployCommand.Build(), configPath)
  .WithServices({ deployer: trackingMock })
  .Args(['production'])
  .ExpectExit(0)
  .Run();

// After test, verify calls
Deno.test('verifies deployment target', () => {
  assertEquals(calls, ['production']);
});
```

---

## Related

- [Testing Commands Guide](../guides/testing-commands.md) - Patterns and examples
- [Commands API](./commands.md) - Command runtime
- [Fluent API](./fluent.md) - Building testable commands

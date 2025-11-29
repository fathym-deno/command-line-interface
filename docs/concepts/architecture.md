---
FrontmatterVersion: 1
DocumentType: Concept
Title: CLI Framework Architecture
Summary: Overview of the CLI framework's component architecture and data flow.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands Concept
    Path: ./commands.md
  - Label: Fluent API Concept
    Path: ./fluent-api.md
---

# CLI Framework Architecture

The CLI framework provides a modular, extensible architecture for building command-line interfaces with type-safe argument parsing, dependency injection, and template scaffolding.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Input                                      │
│                         $ mycli deploy --env prod                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CLI.ts                                        │
│                          Main Orchestrator                                   │
│   • Configures IoC container                                                 │
│   • Manages DFS contexts                                                     │
│   • Coordinates parsing, matching, execution                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  CLICommandParser   │  │  CLICommandMatcher  │  │ CLICommandResolver  │
│  Parse args/flags   │  │  Match command key  │  │  Load command module│
│  from argv          │  │  to registered cmds │  │  from filesystem    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLICommandExecutor                                  │
│                        Execute Command Lifecycle                             │
│   1. ConfigureContext → 2. Init → 3. Run/DryRun → 4. Cleanup                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CommandContext                                    │
│                         Runtime Context Object                               │
│   • Params (args/flags)        • Config (.cli.json)                         │
│   • Services (IoC-resolved)    • Log (logging facade)                       │
│   • Metadata (invocation info) • DFS (file system access)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### CLI Orchestrator

The `CLI` class is the main entry point and orchestrator:

```typescript
import { CLI } from '@fathym/cli';

const cli = new CLI({
  name: 'mycli',
  version: '1.0.0',
  config: import.meta.resolve('./.cli.json'),
});

await cli.Run(Deno.args);
```

Responsibilities:
- Initialize IoC container with default services
- Set up DFS context manager
- Coordinate command discovery and resolution
- Delegate to executor for command lifecycle

### Command Resolution

The `CLICommandResolver` loads command modules from the filesystem or registry:

```typescript
// Filesystem resolver (development)
const resolver = new DFSCLICommandResolver(dfs, manifestPath);

// Programmatic resolver (compiled/embedded)
const resolver = new ProgrammaticCLICommandResolver(commandMap);
```

Resolution strategies:
1. **DFS-based**: Loads from filesystem using DFS handler
2. **Programmatic**: Uses in-memory command registry
3. **Composite**: Combines multiple resolvers

### Command Matching

The `CLICommandMatcher` resolves a command key to a registered command:

```typescript
// Input: ['deploy', '--env', 'prod']
// Output: { command: DeployCommand, remainingArgs: ['--env', 'prod'] }
```

Matching rules:
- Exact key match first
- Subcommand patterns (e.g., `git commit` → `git-commit`)
- Fallback to help command

### Argument Parsing

The `CLICommandInvocationParser` extracts arguments and flags from argv:

```typescript
// Input: ['John', '--loud', '--times=3']
// Output: { args: ['John'], flags: { loud: true, times: 3 } }
```

Parsing features:
- Positional arguments
- Boolean flags (`--flag`)
- Value flags (`--key=value` or `--key value`)
- Short flags (`-v`, `-abc` for multiple)

### Command Execution

The `CLICommandExecutor` runs the command lifecycle:

```typescript
// Execution flow
await executor.Execute(command, invocation, context);

// Lifecycle stages
// 1. ConfigureContext() - IoC and service setup
// 2. Init() - Command initialization
// 3. Run() or DryRun() - Main execution
// 4. Cleanup() - Resource cleanup
```

## Component Interactions

### Startup Flow

```
1. CLI.Run(args) called
   │
2. Load .cli.json configuration
   │
3. Initialize IoC container
   │   • Register default services
   │   • Register custom services from config
   │
4. Set up DFS context manager
   │   • ExecutionDFS (cwd)
   │   • ProjectDFS (.cli.json location)
   │   • BuildDFS (output directory)
   │
5. Create command resolver
   │
6. Parse command key from args
   │
7. Resolve command module
   │
8. Execute command lifecycle
```

### Request Flow

```
User Input → Parser → Matcher → Resolver → Executor → Command → Output

┌─────────┐    ┌────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  argv   │───▶│ Parser │───▶│ Matcher │───▶│ Resolver │───▶│Executor │
└─────────┘    └────────┘    └─────────┘    └──────────┘    └─────────┘
                   │              │               │              │
                   ▼              ▼               ▼              ▼
              Invocation     CommandKey     CommandModule    Context
```

## Extension Points

### Custom Commands

Commands can be added via:
1. **Fluent API**: `Command('name', 'desc').Run(...)`
2. **Class extension**: `class MyCmd extends CommandRuntime`
3. **Programmatic registration**: `resolver.Register('key', command)`

### Custom Services

Services are injected via IoC:
1. **Config-based**: Define in `.cli.json` ioc section
2. **Code-based**: Register in command's `Services()` method
3. **Symbol-based**: Use IoC symbols for interfaces

### Custom DFS Handlers

File operations use pluggable DFS handlers:
1. **Local**: `LocalDFSFileHandler` for filesystem
2. **Memory**: `MemoryDFSFileHandler` for testing
3. **Remote**: `RemoteFetchDFSFileHandler` for HTTP
4. **Composite**: Layer multiple handlers

## Configuration

### .cli.json Structure

```json
{
  "name": "mycli",
  "version": "1.0.0",
  "commands": {
    "deploy": "./commands/deploy.ts",
    "init": "./commands/init.ts"
  },
  "ioc": {
    "ConfigService": {
      "Type": "Singleton",
      "Module": "./services/ConfigService.ts"
    }
  },
  "templates": "./templates"
}
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `LOG_LEVEL` | Set logging verbosity (debug, info, warn, error) |
| `CLI_DRY_RUN` | Enable dry-run mode globally |
| `NO_COLOR` | Disable colored output |

## Related

- [Commands Concept](./commands.md) - Command lifecycle details
- [Fluent API Concept](./fluent-api.md) - Builder pattern
- [Execution Context](./context.md) - Runtime context
- [CLI API Reference](../api/cli.md) - Detailed API

---
FrontmatterVersion: 1
DocumentType: Guide
Title: CLI Framework Agents Guide
Summary: Guardrails for AI collaborators working on the Fathym CLI framework.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
  - codex
References:
  - Label: Project README
    Path: ../README.md
  - Label: Project Guide
    Path: ./GUIDE.md
  - Label: Documentation Index
    Path: ./README.md
---

# AGENTS: CLI Framework

This guide aligns AI collaborators working on the Fathym CLI framework.

## Project Overview

The CLI framework provides a type-safe, fluent API for building command-line interfaces with:
- Fluent builder pattern for command definitions
- Zod-based argument and flag validation
- Dependency injection via IoC container
- DFS integration for file operations
- Template scaffolding system
- Intent-based testing framework

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Application                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    │
│  │   CLI.ts    │───▶│ CLICommandParser │───▶│   CLICommandMatcher     │    │
│  │ Orchestrator│    │ Parse args/flags │    │ Resolve command by key  │    │
│  └─────────────┘    └──────────────────┘    └─────────────────────────┘    │
│         │                                              │                    │
│         ▼                                              ▼                    │
│  ┌─────────────────┐                        ┌─────────────────────────┐    │
│  │ CLICommandResolver                       │   CLICommandExecutor    │    │
│  │ Load command modules                     │   Execute lifecycle     │    │
│  │ from filesystem/memory                   │   Init→Run→Cleanup      │    │
│  └─────────────────┘                        └─────────────────────────┘    │
│         │                                              │                    │
│         ▼                                              ▼                    │
│  ┌─────────────────┐                        ┌─────────────────────────┐    │
│  │ CommandRuntime  │                        │    CommandContext       │    │
│  │ Abstract base   │◀───────────────────────│  Params, Services, Log  │    │
│  │ for all commands│                        │  Config, Metadata       │    │
│  └─────────────────┘                        └─────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Concepts for AI Collaborators

### 1. Command Lifecycle

Commands follow a predictable lifecycle:
1. **ConfigureContext** - Set up IoC and services (automatic)
2. **Init** - Initialize command state
3. **Run** or **DryRun** - Execute command logic
4. **Cleanup** - Release resources

### 2. Fluent Builder Pattern

Commands are defined using a chainable builder:
```typescript
Command('name', 'description')
  .Args(argsSchema)        // Define positional arguments
  .Flags(flagsSchema)      // Define flags/options
  .Params(ParamsClass)     // Custom params accessor
  .Services(servicesFn)    // Dependency injection
  .Run(handlerFn);         // Execution logic
```

### 3. DFS Integration

The CLI integrates with the Distributed File System (DFS):
- `CLIDFSContextManager` - Manages multiple DFS contexts
- `ExecutionDFS` - Where the CLI runs (cwd)
- `ProjectDFS` - Project root (walks up to find `.cli.json`)
- `BuildDFS` - Build artifacts location

### 4. Template Scaffolding

Two template locator strategies:
- `DFSTemplateLocator` - Loads from filesystem
- `EmbeddedTemplateLocator` - Loads from compiled JSON bundle

## Working Rules

### Stay in Scope
- All CLI framework work lives under `projects/ref-arch/command-line-interface/`
- Command system is in `src/commands/`
- Fluent builders are in `src/fluent/`
- Executor and runtime are in `src/executor/`
- Template system is in `src/templates/` and `src/scaffolding/`

### Code Patterns

**Fluent command pattern:**
```typescript
import { Command } from '@fathym/cli';
import { z } from 'zod';

export default Command('deploy', 'Deploy the project')
  .Flags(z.object({
    environment: z.string().optional().describe('Target environment'),
  }))
  .Services(async (ctx, ioc) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Params, Services, Log }) => {
    const env = Params.Flag('environment') ?? 'production';
    Log.Info(`Deploying to ${env}...`);
  });
```

**Class-based command pattern:**
```typescript
import { CommandRuntime, CommandContext } from '@fathym/cli';

export default class DeployCommand extends CommandRuntime<TArgs, TFlags, TServices> {
  public Key = 'deploy';
  public Description = 'Deploy the project';

  public override async Run(ctx: CommandContext<...>): Promise<void> {
    ctx.Log.Info('Deploying...');
  }
}
```

**Custom params pattern:**
```typescript
class MyParams extends CommandParams<TArgs, TFlags> {
  get ProjectName(): string {
    return this.Arg(0) ?? 'default-project';
  }

  get IsVerbose(): boolean {
    return this.Flag('verbose') ?? false;
  }
}

Command('init', 'Initialize project')
  .Params(MyParams)
  .Run(({ Params }) => {
    console.log(Params.ProjectName); // Type-safe access
  });
```

### Testing
- Tests are in `tests/` with `.tests.ts` entry point
- Intent tests are in `tests/intents/`
- Run: `deno task test`
- Use `CommandIntent` for declarative testing

### Documentation
- In-code JSDoc for all public APIs
- External docs in `docs/` folder
- Update docs when changing public interfaces

## Common Tasks

### Adding a New Command
1. Create command file: `commands/my-command.ts`
2. Use fluent API: `Command('my-command', 'Description')`
3. Define Args/Flags with Zod schemas
4. Implement Run handler
5. Export from commands manifest
6. Add intent tests: `tests/intents/my-command.intents.ts`

### Adding Service Injection
1. Define service in `.cli.json` IoC configuration
2. Use `.Services()` in command builder
3. Access via `Services` in handler context
4. Consider lifecycle (init/cleanup)

### Creating Templates
1. Add template files in `templates/my-template/`
2. Use Handlebars syntax for dynamic content
3. Register in `.cli.json` or template locator
4. Access via `TemplateScaffolder`

### Modifying the Parser
1. Read `src/parser/CLICommandInvocationParser.ts`
2. Understand invocation token flow
3. Update parsing logic
4. Add tests for new syntax
5. Update `docs/concepts/commands.md`

## File Map

| Path | Purpose |
|------|---------|
| `src/CLI.ts` | Main orchestrator |
| `src/commands/` | Command runtime and lifecycle |
| `src/fluent/` | Builder pattern implementation |
| `src/executor/` | Command execution engine |
| `src/parser/` | Argument/flag parsing |
| `src/matcher/` | Command resolution |
| `src/help/` | Help system generation |
| `src/templates/` | Template locators |
| `src/scaffolding/` | Scaffolding engine |
| `src/intents/` | Testing framework |
| `tests/` | Test files |
| `docs/` | Documentation |

## Integration Points

CLI framework integrates with:
- **@fathym/dfs** - File system abstraction
- **@fathym/ioc** - Dependency injection container
- **Zod** - Schema validation
- **Handlebars** - Template processing

When modifying integration points, ensure backwards compatibility or provide migration guidance.

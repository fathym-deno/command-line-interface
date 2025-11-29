---
FrontmatterVersion: 1
DocumentType: Index
Title: "@fathym/cli Documentation"
Summary: Comprehensive documentation for the Fathym CLI framework
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym
References:
  - Label: JSR Package
    Path: https://jsr.io/@fathym/cli
  - Label: GitHub
    Path: https://github.com/fathym-deno/fathym-dev-space
---

# @fathym/cli Documentation

A powerful, type-safe CLI framework for Deno with fluent command building, dependency injection, and template scaffolding.

## Quick Links

### Getting Started
- [Getting Started Guide](./guides/getting-started.md) - Build your first CLI
- [Building Commands](./guides/building-commands.md) - Command patterns and best practices

### Concepts
- [Architecture](./concepts/architecture.md) - Framework overview and data flow
- [Commands](./concepts/commands.md) - Command lifecycle and patterns
- [Fluent API](./concepts/fluent-api.md) - Builder pattern deep-dive
- [Execution Context](./concepts/context.md) - DFS, IoC, and services

### API Reference
- [CLI Class](./api/cli.md) - Main orchestrator
- [Commands](./api/commands.md) - Command types and runtime
- [Fluent Builder](./api/fluent.md) - Builder API reference
- [DFS Context](./api/dfs.md) - File system context management
- [Templates](./api/templates.md) - Template scaffolding
- [Testing](./api/testing.md) - Intent-based testing
- [Utilities](./api/utilities.md) - Utility functions

### Guides
- [CLI Configuration](./guides/cli-configuration.md) - .cli.json and .cli.init.ts
- [Testing Commands](./guides/testing-commands.md) - Intent testing framework
- [Template Scaffolding](./guides/scaffolding.md) - Project generation
- [Logging & Output](./guides/logging-output.md) - Logging, spinners, styling
- [Advanced Infrastructure](./guides/advanced-infrastructure.md) - Internal architecture
- [Compiling CLIs](./guides/embedded-cli.md) - Standalone executables

### Contributors
- [AGENTS.md](./AGENTS.md) - AI collaboration guide
- [GUIDE.md](./GUIDE.md) - Development playbook

---

## Overview

| Component | Description | Key Files |
|-----------|-------------|-----------|
| **CLI** | Main orchestrator | `CLI.ts` |
| **Commands** | Command runtime and lifecycle | `commands/CommandRuntime.ts` |
| **Fluent API** | Builder pattern for commands | `fluent/Command.ts`, `CommandModuleBuilder.ts` |
| **Executor** | Command execution engine | `executor/CLICommandExecutor.ts` |
| **Parser** | Argument parsing | `parser/CLICommandInvocationParser.ts` |
| **Matcher** | Command resolution | `matcher/CLICommandMatcher.ts` |
| **Help** | Help generation | `help/CLIHelpBuilder.ts`, `HelpCommand.ts` |
| **Templates** | Scaffolding system | `scaffolding/TemplateScaffolder.ts` |
| **Intents** | Testing framework | `intents/CommandIntent.ts` |

---

## Core Features

### Fluent Command Building

Define commands with a chainable, type-safe API:

```typescript
import { Command, CommandParams } from '@fathym/cli';
import { z } from 'zod';

// Define schemas
const ArgsSchema = z.tuple([
  z.string().optional().describe('Name to greet').meta({ argName: 'name' }),
]);

const FlagsSchema = z.object({
  loud: z.boolean().optional().describe('Shout the greeting'),
});

// Custom Params class with typed getters
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

// Build the command
export default Command('greet', 'Greet someone by name')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(GreetParams)
  .Run(({ Params, Log }) => {
    const msg = `Hello, ${Params.Name}!`;
    Log.Info(Params.IsLoud ? msg.toUpperCase() : msg);
  });
```

### Dependency Injection

Inject services via IoC container:

```typescript
import { Command, CommandParams, CLIDFSContextManager } from '@fathym/cli';
import type { IoCContainer } from '@fathym/cli';
import { z } from 'zod';

class DeployParams extends CommandParams<[], {}> {}

export default Command('deploy', 'Deploy the project')
  .Args(z.tuple([]))
  .Flags(z.object({}))
  .Params(DeployParams)
  .Services(async (_ctx, ioc: IoCContainer) => ({
    dfs: await ioc.Resolve(CLIDFSContextManager),
    config: await ioc.Resolve(ConfigService),
  }))
  .Run(async ({ Services, Log }) => {
    const projectRoot = await Services.dfs.GetProjectDFS();
    Log.Info(`Deploying from: ${projectRoot.Root}`);
  });
```

### Intent-Based Testing

Test commands declaratively with suite-based organization:

```typescript
import { CommandIntents } from '@fathym/cli';
import GreetCommand from '../commands/greet.ts';

const configPath = import.meta.resolve('../.cli.json');

CommandIntents('Greet Command', GreetCommand.Build(), configPath)
  .Intent('greets with default name', (int) =>
    int.Args([undefined]).Flags({}).ExpectLogs('Hello, World!').ExpectExit(0))
  .Intent('greets by name', (int) =>
    int.Args(['Alice']).Flags({}).ExpectLogs('Hello, Alice!').ExpectExit(0))
  .Intent('greets loudly', (int) =>
    int.Args(['World']).Flags({ loud: true }).ExpectLogs('HELLO, WORLD!').ExpectExit(0))
  .Run();
```

### Template Scaffolding

Generate projects from Handlebars templates:

```typescript
import { Command, CommandParams, CLIDFSContextManager, TemplateLocator, TemplateScaffolder } from '@fathym/cli';
import type { IoCContainer } from '@fathym/cli';
import { z } from 'zod';

const ArgsSchema = z.tuple([
  z.string().optional().describe('Project name').meta({ argName: 'name' }),
]);

class InitParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get ProjectName(): string {
    return this.Arg(0) ?? 'my-project';
  }
}

export default Command('init', 'Initialize a new project')
  .Args(ArgsSchema)
  .Flags(z.object({}))
  .Params(InitParams)
  .Services(async (ctx, ioc: IoCContainer) => {
    const dfsCtxMgr = await ioc.Resolve(CLIDFSContextManager);
    return {
      scaffolder: new TemplateScaffolder(
        await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
        await dfsCtxMgr.GetExecutionDFS(),
        { projectName: ctx.Params.ProjectName },
      ),
    };
  })
  .Run(async ({ Services, Log }) => {
    await Services.scaffolder.Scaffold({
      templateName: 'init',
      outputDir: '.',
    });
    Log.Success('Project initialized!');
  });
```

---

## Architecture

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

---

## Installation

```bash
# Add to your deno.json imports
{
  "imports": {
    "@fathym/cli": "jsr:@fathym/cli@latest"
  }
}
```

---

## Next Steps

1. **New to CLI development?** Start with the [Getting Started Guide](./guides/getting-started.md)
2. **Building commands?** Read [Commands Concept](./concepts/commands.md) and [Fluent API](./concepts/fluent-api.md)
3. **Testing your CLI?** See [Testing Commands Guide](./guides/testing-commands.md)
4. **Distributing your CLI?** Check [Compiling CLIs Guide](./guides/embedded-cli.md)

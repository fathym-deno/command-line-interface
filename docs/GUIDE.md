---
FrontmatterVersion: 1
DocumentType: Guide
Title: CLI Framework Guide
Summary: Operating playbook for developing and maintaining the Fathym CLI framework.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
  - codex
References:
  - Label: Project README
    Path: ../README.md
  - Label: Agents Guide
    Path: ./AGENTS.md
  - Label: Documentation Index
    Path: ./README.md
---

# CLI Framework Guide

Use this playbook to keep CLI framework development predictable and fast.

## Current Status

The CLI framework provides a stable API for:
- Fluent command building with type-safe Zod schemas
- Command lifecycle management (Init → Run → Cleanup)
- Dependency injection via IoC container
- DFS integration for file operations
- Template scaffolding with Handlebars
- Intent-based testing framework

## Development Workflow

### 1. Understand Before Changing

```bash
# Read the existing implementation
deno task check              # Type check
deno task test               # Run tests
```

Key files to understand:
- `src/CLI.ts` - Main orchestrator
- `src/commands/CommandRuntime.ts` - Command lifecycle
- `src/fluent/Command.ts` - Fluent builder entry point
- `src/executor/CLICommandExecutor.ts` - Execution engine

### 2. Make Changes

Follow these patterns:
- Commands use fluent API starting with `Command()`
- Args/Flags defined with Zod schemas
- Services injected via `.Services()` method
- Class-based commands extend `CommandRuntime`

### 3. Test Thoroughly

```bash
deno task test               # Run all tests
deno task build              # Full build (fmt, lint, test)
```

### 4. Document

- Add JSDoc to all public APIs
- Update relevant docs in `docs/` folder
- Update CHANGELOG if significant change

## Common Development Tasks

### Adding a Command

1. **Create command file**
   ```typescript
   // commands/my-command.ts
   import { Command } from '@fathym/cli';
   import { z } from 'zod';

   export default Command('my-command', 'Description of command')
     .Flags(z.object({
       verbose: z.boolean().optional().describe('Enable verbose output'),
     }))
     .Run(({ Params, Log }) => {
       if (Params.Flag('verbose')) {
         Log.Debug('Verbose mode enabled');
       }
       Log.Info('Command executed!');
     });
   ```

2. **Add to command manifest**
   ```json
   // .cli.json
   {
     "commands": {
       "my-command": "./commands/my-command.ts"
     }
   }
   ```

3. **Add intent tests**
   ```typescript
   // tests/intents/my-command.intents.ts
   import { CommandIntent } from '@fathym/cli';
   import MyCommand from '../../commands/my-command.ts';

   CommandIntent('executes with verbose', MyCommand, import.meta.resolve('../../.cli.json'))
     .Flags({ verbose: true })
     .ExpectLogs('Verbose mode enabled', 'Command executed!')
     .ExpectExit(0)
     .Run();
   ```

### Adding Service Injection

1. **Configure IoC in .cli.json**
   ```json
   {
     "ioc": {
       "ConfigService": {
         "Type": "Singleton",
         "Module": "./services/ConfigService.ts"
       }
     }
   }
   ```

2. **Inject in command**
   ```typescript
   Command('deploy', 'Deploy project')
     .Services(async (ctx, ioc) => ({
       config: await ioc.Resolve(ConfigService),
     }))
     .Run(async ({ Services }) => {
       const env = Services.config.GetEnvironment();
     });
   ```

### Creating Template Files

1. **Create template directory**
   ```
   templates/my-template/
   ├── {{name}}/
   │   ├── deno.jsonc.hbs
   │   ├── README.md.hbs
   │   └── src/
   │       └── mod.ts.hbs
   ```

2. **Use Handlebars syntax**
   ```handlebars
   {{! deno.jsonc.hbs }}
   {
     "name": "{{name}}",
     "version": "0.0.1"
   }
   ```

3. **Scaffold in command**
   ```typescript
   Command('init', 'Initialize project')
     .Services(async (ctx, ioc) => ({
       scaffolder: new TemplateScaffolder(
         await ioc.Resolve<TemplateLocator>(ioc.Symbol('TemplateLocator')),
         await dfsCtxMgr.GetExecutionDFS(),
         { name: ctx.Params.Arg(0) }
       ),
     }))
     .Run(async ({ Services }) => {
       await Services.scaffolder.Scaffold({
         templateName: 'my-template',
         outputDir: '.',
       });
     });
   ```

### Modifying Command Lifecycle

The command lifecycle is in `src/commands/CommandRuntime.ts`:

- **Init phase**: `Init()` method
- **Execution phase**: `Run()` or `DryRun()` method
- **Cleanup phase**: `Cleanup()` method

When modifying:
1. Understand the lifecycle order
2. Consider async cleanup with try/finally
3. Add tests for lifecycle changes
4. Update `docs/concepts/commands.md`

### Debugging Commands

Enable debug logging:
```typescript
// Set environment variable
Deno.env.set('LOG_LEVEL', 'debug');
```

Or use Log methods:
```typescript
.Run(({ Log }) => {
  Log.Debug('Detailed info');
  Log.Info('Standard info');
  Log.Warn('Warning');
  Log.Error('Error');
});
```

## Project Structure

```
command-line-interface/
├── src/
│   ├── CLI.ts                    # Main orchestrator
│   ├── CLICommandResolver.ts     # Command loading
│   ├── CLIDFSContextManager.ts   # DFS context management
│   ├── commands/                 # Command system
│   │   ├── CommandRuntime.ts     # Base runtime class
│   │   └── CommandContext.ts     # Execution context
│   ├── fluent/                   # Builder pattern
│   │   ├── Command.ts            # Entry point
│   │   └── CommandModuleBuilder.ts
│   ├── executor/                 # Execution engine
│   │   └── CLICommandExecutor.ts
│   ├── parser/                   # Argument parsing
│   │   └── CLICommandInvocationParser.ts
│   ├── matcher/                  # Command resolution
│   │   └── CLICommandMatcher.ts
│   ├── help/                     # Help generation
│   ├── templates/                # Template locators
│   ├── scaffolding/              # Scaffolding engine
│   ├── intents/                  # Testing framework
│   └── logging/                  # Logging utilities
├── tests/                        # Test files
│   ├── intents/                  # Intent tests
│   └── .tests.ts                 # Test entry point
├── docs/                         # Documentation
│   ├── concepts/                 # Core concepts
│   ├── api/                      # API reference
│   └── guides/                   # How-to guides
├── deno.jsonc                    # Project config
└── README.md                     # Project overview
```

## Quality Checklist

Before submitting changes:

- [ ] `deno task check` passes
- [ ] `deno task test` passes
- [ ] New public APIs have JSDoc
- [ ] Breaking changes documented
- [ ] Relevant docs updated
- [ ] Intent tests added for new commands

## Troubleshooting

### Tests Failing

1. Check for missing IoC registrations
2. Verify Zod schemas match expected input
3. Check for async timing issues
4. Verify DFS contexts are properly initialized

### Command Not Found

1. Verify command is exported in manifest
2. Check command key matches invocation
3. Verify resolver can find the module
4. Check for case sensitivity issues

### Template Scaffolding Issues

1. Verify template exists in locator
2. Check Handlebars syntax is valid
3. Verify output directory is writable
4. Check for path normalization (./templates/ prefix)

### DFS Context Errors

1. Verify `.cli.json` exists for ProjectDFS
2. Check DFS registration order
3. Verify paths are absolute where required
4. Check handler is registered before access

## Roadmap Considerations

Future enhancements to consider:
- Interactive prompts with inquirer-style API
- Plugin system for third-party commands
- Watch mode for development
- Improved shell completion
- Command aliases and shortcuts

## Resources

- [Zod Documentation](https://zod.dev)
- [Handlebars Guide](https://handlebarsjs.com/guide/)
- [@fathym/dfs](./../../distributed-file-system/README.md)
- [@fathym/ioc](https://jsr.io/@fathym/ioc)

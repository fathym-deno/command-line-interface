---
FrontmatterVersion: 1
DocumentType: API
Title: Help System API Reference
Summary: API reference for CLI help generation including HelpContext, CLIHelpBuilder, and HelpCommand.
Created: 2025-11-30
Updated: 2025-11-30
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands API
    Path: ./commands.md
---

# Help System API Reference

API reference for the CLI help system including automatic help generation, context building, and custom help rendering.

## Overview

The help system provides automatic `--help` support for all commands and groups, with structured output that includes usage, arguments, flags, and examples.

```typescript
import { CLIHelpBuilder, HelpCommand, HelpContext } from '@fathym/cli';
```

---

## HelpContext

The structured data type used to render help output.

```typescript
import type { HelpContext } from '@fathym/cli';
```

### Type Definition

```typescript
type HelpContext = {
  /** Optional header shown at the top of help output */
  Header?: string;

  /** Intro block for root CLI overview */
  Intro?: {
    Name: string;
    Version: string;
    Description?: string;
    Usage?: string;
    Examples?: string[];
  };

  /** Ordered list of help sections to render */
  Sections?: Array<
    | { type: 'CommandDetails' } & CommandModuleMetadata
    | { type: 'GroupDetails' } & CommandModuleMetadata
    | { type: 'CommandList'; title: string; items: CommandModuleMetadata[] }
    | { type: 'GroupList'; title: string; items: CommandModuleMetadata[] }
    | { type: 'Error'; message: string; suggestion?: string }
  >;
};
```

### Section Types

| Type | Purpose |
|------|---------|
| `CommandDetails` | Full command documentation with args, flags, examples |
| `GroupDetails` | Group documentation with description and usage |
| `CommandList` | List of available commands |
| `GroupList` | List of available subgroups |
| `Error` | Error message with optional "did you mean" suggestion |

### Validation

```typescript
import { HelpContextSchema, isHelpContext } from '@fathym/cli';

// Validate a HelpContext object
const result = HelpContextSchema.safeParse(context);
if (!result.success) {
  console.error('Invalid help context:', result.error);
}

// Type guard
if (isHelpContext(value)) {
  // value is HelpContext
}
```

---

## CLIHelpBuilder

Builds `HelpContext` from CLI configuration and command maps.

```typescript
import { CLIHelpBuilder } from '@fathym/cli';
```

### Constructor

```typescript
constructor(resolver: CLICommandResolver)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `resolver` | `CLICommandResolver` | Command resolver for loading command instances |

### Methods

#### Build

```typescript
async Build(
  config: CLIConfig,
  commandMap: Map<string, CLICommandEntry>,
  key: string | undefined,
  flags: Record<string, unknown>,
  cmdInst?: CommandRuntime,
  groupInst?: CommandRuntime
): Promise<HelpContext | undefined>
```

Build a `HelpContext` for a given command key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `CLIConfig` | CLI configuration |
| `commandMap` | `Map<string, CLICommandEntry>` | Registered commands |
| `key` | `string \| undefined` | Command key (undefined for root help) |
| `flags` | `Record<string, unknown>` | Parsed flags |
| `cmdInst` | `CommandRuntime` | Resolved command instance |
| `groupInst` | `CommandRuntime` | Resolved group instance |

**Returns:** `HelpContext` or `undefined` if no help available

### Usage

```typescript
const builder = new CLIHelpBuilder(resolver);

// Root help
const rootHelp = await builder.Build(config, commandMap, undefined, {});

// Command help
const cmdHelp = await builder.Build(config, commandMap, 'deploy', {}, deployCmd);

// Group help
const grpHelp = await builder.Build(config, commandMap, 'scaffold', {}, undefined, scaffoldGroup);
```

---

## HelpCommand

Runtime command that renders `HelpContext` to the terminal.

```typescript
import { HelpCommand, HelpCommandParams } from '@fathym/cli';
```

### Class Definition

```typescript
class HelpCommand extends CommandRuntime<HelpCommandParams> {
  Run(ctx: CommandContext<HelpCommandParams>): void;
  BuildMetadata(): CommandModuleMetadata;
}
```

### Parameters

```typescript
class HelpCommandParams extends CommandParams<[], HelpContext> {
  get Header(): string | undefined;
  get Intro(): HelpContext['Intro'];
  get Sections(): HelpContext['Sections'];
}
```

### Output Format

The help command renders sections with visual markers:

```
📘 My CLI v1.0.0
A powerful command-line tool

Usage:
  mycli <command> [options]

Examples:
  mycli deploy
  mycli scaffold component

🔸 Available Commands
  deploy - Deploy to production
  build - Build the project

🔸 Available Groups
  scaffold - Code generation commands
```

### Error Output

When a command is not found:

```
❌ Unknown command: deploy
💡 Did you mean: deploy?
```

---

## Automatic Help

The CLI framework automatically provides `--help` support:

```bash
# Root help
mycli --help

# Command help
mycli deploy --help

# Group help
mycli scaffold --help
```

### How It Works

1. CLI detects `--help` flag in arguments
2. `CLIHelpBuilder.Build()` creates `HelpContext`
3. `HelpCommand.Run()` renders the context
4. Process exits with code 0

---

## Customizing Help

### Command Metadata

Help content comes from command metadata:

```typescript
Command('deploy', 'Deploy to production')
  .Args(z.tuple([z.string().describe('Target environment')]))
  .Flags(z.object({
    force: z.boolean().optional().describe('Skip confirmation'),
    config: z.string().optional().describe('Config file path'),
  }))
  .Run(/* ... */);
```

This generates:

```
📘 Command: deploy
Deploy to production

Usage:
  mycli deploy <target>

Args:
  <target> - Target environment

Flags:
  --force - Skip confirmation
  --config - Config file path
```

### Group Metadata

Groups use `.metadata.ts` files:

```typescript
// commands/scaffold/.metadata.ts
export default {
  Name: 'scaffold',
  Description: 'Code generation and scaffolding commands',
  Usage: 'mycli scaffold <generator> [options]',
  Examples: [
    'mycli scaffold component MyComponent',
    'mycli scaffold service AuthService',
  ],
};
```

---

## Source Files

- [CLIHelpBuilder.ts](../../src/help/CLIHelpBuilder.ts) - Help context builder
- [HelpCommand.ts](../../src/help/HelpCommand.ts) - Help renderer
- [HelpContext.ts](../../src/help/HelpContext.ts) - Type definitions

---

## Related

- [Commands API](./commands.md) - Command metadata
- [Fluent API](./fluent.md) - Building commands with metadata
- [Building Commands Guide](../guides/building-commands.md) - Writing help-friendly commands

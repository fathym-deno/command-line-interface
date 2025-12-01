---
FrontmatterVersion: 1
DocumentType: API
Title: Logging API Reference
Summary: API reference for CLI logging including CommandLog and TelemetryLogAdapter.
Created: 2025-11-30
Updated: 2025-11-30
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Commands API
    Path: ./commands.md
  - Label: Utilities API
    Path: ./utilities.md
---

# Logging API Reference

API reference for CLI logging utilities including the `CommandLog` interface and `TelemetryLogAdapter` for OpenTelemetry integration.

## Overview

The CLI framework provides a simple, semantic logging interface for command output with four log levels. For observability needs, `TelemetryLogAdapter` bridges CLI logging to OpenTelemetry.

```typescript
import { TelemetryLogAdapter } from "@fathym/cli";
```

---

## CommandLog

The logging interface available in all command handlers via `ctx.Log`.

```typescript
type CommandLog = {
  Info: (...args: unknown[]) => void;
  Warn: (...args: unknown[]) => void;
  Error: (...args: unknown[]) => void;
  Success: (...args: unknown[]) => void;
};
```

### Methods

| Method    | Purpose                       | Visual Cue               |
| --------- | ----------------------------- | ------------------------ |
| `Info`    | Standard informational output | Normal text              |
| `Warn`    | Warning messages              | Yellow/caution indicator |
| `Error`   | Error messages                | Red/error indicator      |
| `Success` | Success indicators            | Green/checkmark          |

### Usage in Commands

```typescript
Command("deploy", "Deploy the application")
  .Run(async ({ Log }) => {
    Log.Info("Starting deployment...");
    Log.Info("📦 Building artifacts");

    try {
      await buildArtifacts();
      Log.Success("Build complete!");

      await deploy();
      Log.Success("Deployment successful!");
    } catch (error) {
      Log.Error("Deployment failed:", error.message);
      throw error;
    }
  });
```

### Multiple Arguments

All methods accept multiple arguments, joined with spaces:

```typescript
Log.Info("Processing", fileName, "from", sourcePath);
// Output: Processing config.json from ./src

Log.Error("Failed to connect:", host, "on port", port);
// Output: Failed to connect: localhost on port 3000
```

---

## TelemetryLogAdapter

Adapter that implements `CommandLog` and forwards to an OpenTelemetry `TelemetryLogger`.

```typescript
import { TelemetryLogAdapter } from "@fathym/cli";
```

### Constructor

```typescript
constructor(
  logger: TelemetryLogger,
  baseAttributes?: Record<string, unknown>
)
```

| Parameter        | Type                      | Description                         |
| ---------------- | ------------------------- | ----------------------------------- |
| `logger`         | `TelemetryLogger`         | OpenTelemetry logger instance       |
| `baseAttributes` | `Record<string, unknown>` | Attributes added to all log entries |

### Type Definition

```typescript
type TelemetryLogEntry = {
  level: "info" | "warn" | "error" | "success";
  message: string;
  attributes?: Record<string, unknown>;
};
```

### Usage

```typescript
import { TelemetryLogAdapter } from "@fathym/cli";
import { logs } from "@opentelemetry/api-logs";

// Create logger from OpenTelemetry
const otelLogger = logs.getLogger("my-cli");

// Create adapter with base attributes
const logAdapter = new TelemetryLogAdapter(otelLogger, {
  cliVersion: "1.0.0",
  environment: Deno.env.get("ENV") ?? "development",
});

// Use like CommandLog
logAdapter.Info("Starting operation");
logAdapter.Success("Operation complete");
logAdapter.Warn("Deprecated feature used");
logAdapter.Error("Operation failed");
```

### Level Mapping

| CommandLog Method | OpenTelemetry Level | Additional Attributes                     |
| ----------------- | ------------------- | ----------------------------------------- |
| `Info`            | `info`              | `{ levelHint: 'info' }`                   |
| `Warn`            | `warn`              | `{ levelHint: 'warn' }`                   |
| `Error`           | `error`             | `{ levelHint: 'error' }`                  |
| `Success`         | `info`              | `{ levelHint: 'success', success: true }` |

### Registering in IoC

```typescript
// .cli.init.ts
import type { CLIInitFn } from "@fathym/cli";
import { TelemetryLogAdapter } from "@fathym/cli";
import { logs } from "@opentelemetry/api-logs";

export default ((ioc) => {
  const otelLogger = logs.getLogger("my-cli");

  ioc.Register("CommandLog", () =>
    new TelemetryLogAdapter(otelLogger, {
      cli: "my-cli",
    }));
}) satisfies CLIInitFn;
```

---

## Verbose/Debug Logging

The framework does not include a `Debug` level. Implement verbose logging with flags:

```typescript
import { Command, CommandParams } from "@fathym/cli";
import { z } from "zod";

const FlagsSchema = z.object({
  verbose: z.boolean().optional().describe("Enable verbose output"),
});

class MyParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Verbose(): boolean {
    return this.Flag("verbose") ?? false;
  }
}

Command("process", "Process data")
  .Flags(FlagsSchema)
  .Params(MyParams)
  .Run(({ Params, Log }) => {
    if (Params.Verbose) {
      Log.Info("[DEBUG] Loading configuration...");
      Log.Info("[DEBUG] Config path:", configPath);
    }

    Log.Info("Processing data...");
    // ... process

    if (Params.Verbose) {
      Log.Info("[DEBUG] Processed", count, "items");
    }

    Log.Success("Complete!");
  });
```

---

## Log Capture for Testing

Use `captureLogs` to capture output during tests:

```typescript
import { captureLogs } from "@fathym/cli";

Deno.test("command logs correctly", async () => {
  const output = await captureLogs(async () => {
    await cli.run(["deploy", "--env", "staging"]);
  });

  assert(output.includes("Starting deployment"));
  assert(output.includes("Deployment successful"));
});
```

---

## Best Practices

### 1. Use Semantic Levels

```typescript
// Good - semantic meaning
Log.Info("Connecting to database...");
Log.Success("Connected");
Log.Warn("Using deprecated API");
Log.Error("Connection failed");

// Bad - all Info
Log.Info("Success: Connected");
Log.Info("Warning: Using deprecated API");
Log.Info("Error: Connection failed");
```

### 2. Include Context

```typescript
// Good - includes context
Log.Info(`Processing ${files.length} files from ${directory}`);
Log.Error(`Failed to read ${filePath}:`, error.message);

// Bad - missing context
Log.Info("Processing files");
Log.Error("Read failed");
```

### 3. Progress Updates

```typescript
for (let i = 0; i < items.length; i++) {
  Log.Info(`Processing item ${i + 1}/${items.length}`);
  await processItem(items[i]);
}
Log.Success(`Processed ${items.length} items`);
```

---

## Source Files

- [TelemetryLogAdapter.ts](../../src/logging/TelemetryLogAdapter.ts) - OpenTelemetry adapter
- [CommandLog.ts](../../src/commands/CommandLog.ts) - CommandLog type definition

---

## Related

- [Commands API](./commands.md) - Using Log in command context
- [Utilities API](./utilities.md) - `captureLogs` for testing
- [Testing API](./testing.md) - Testing command output

---
FrontmatterVersion: 1
DocumentType: Guide
Title: Logging and Output Guide
Summary: Guide to CLI logging, telemetry, spinners, and styled output.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Building Commands
    Path: ./building-commands.md
---

# Logging and Output Guide

This guide covers logging, telemetry, progress spinners, and styled output in @fathym/cli commands.

## Command Logging

Commands receive a `Log` object in their context for structured output.

### Basic Usage

```typescript
import { Command, CommandParams } from "@fathym/cli";
import { z } from "zod";

class BuildParams extends CommandParams<[], {}> {}

export default Command("build", "Build the project")
  .Args(z.tuple([]))
  .Flags(z.object({}))
  .Params(BuildParams)
  .Run(({ Log }) => {
    Log.Info("Starting build...");
    Log.Warn("Deprecated config detected");
    Log.Error("Build failed");
    Log.Success("Build complete!");
  });
```

### Log Methods

| Method          | Purpose             | Icon       |
| --------------- | ------------------- | ---------- |
| `Log.Info()`    | General information | ℹ (blue)   |
| `Log.Warn()`    | Warnings            | ⚠ (yellow) |
| `Log.Error()`   | Errors              | ✖ (red)    |
| `Log.Success()` | Success messages    | ✅ (green) |

### Multiple Arguments

Log methods accept multiple arguments:

```typescript
Log.Info("Processing", filename, "with options", options);
// Output: ℹ Processing myfile.ts with options {"minify":true}
```

### No Debug Method

The framework intentionally omits `Log.Debug()`. For debug output, use a verbose flag:

```typescript
const FlagsSchema = z.object({
  verbose: z.boolean().optional().describe("Enable verbose output"),
});

class BuildParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Verbose(): boolean {
    return this.Flag("verbose") ?? false;
  }
}

Command("build", "Build project")
  .Args(z.tuple([]))
  .Flags(FlagsSchema)
  .Params(BuildParams)
  .Run(({ Params, Log }) => {
    if (Params.Verbose) {
      Log.Info("Debug: Entering compilation phase");
    }
    // Main logic...
  });
```

---

## Telemetry Logging

For structured telemetry with attributes, use the telemetry logger.

### Creating a Telemetry Logger

```typescript
import { createCliTelemetryLogger } from "@fathym/cli";

const logger = createCliTelemetryLogger({
  baseAttributes: {
    service: "my-cli",
    version: "1.0.0",
  },
});

logger.info("Starting operation", { operation: "build" });
logger.warn("Slow performance detected", { duration: 5000 });
logger.error("Operation failed", { errorCode: "E001" });
```

### Telemetry Logger Methods

| Method    | Level   | Prefix     |
| --------- | ------- | ---------- |
| `debug()` | Debug   | … (cyan)   |
| `info()`  | Info    | ℹ (blue)   |
| `warn()`  | Warning | ⚠ (yellow) |
| `error()` | Error   | ✖ (red)    |
| `fatal()` | Fatal   | 💥 (red)   |

### Adding Context

Create child loggers with additional context:

```typescript
const logger = createCliTelemetryLogger();

// Create logger with added context
const deployLogger = logger.withContext({
  environment: "production",
  region: "us-east-1",
});

deployLogger.info("Starting deployment");
// Output: ℹ Starting deployment {"environment":"production","region":"us-east-1"}
```

### TelemetryLogAdapter

Wrap a telemetry logger for use in commands:

```typescript
import { createCliTelemetryLogger, TelemetryLogAdapter } from "@fathym/cli";

const telemetry = createCliTelemetryLogger();
const Log = new TelemetryLogAdapter(telemetry, {
  command: "deploy",
});

Log.Info("Deploying...");
Log.Success("Deployed!");
```

---

## Progress Spinners

Display animated spinners during long operations.

### Built-in Spinners

| Spinner          | Frames     | Best For              |
| ---------------- | ---------- | --------------------- |
| `ArcSpinner`     | ◜◠◝◞◡◟     | Modern terminals      |
| `DotsSpinner`    | ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ | Unicode terminals     |
| `WindowsSpinner` | /-\|       | Windows compatibility |

### Spinner Structure

```typescript
import type { Spinner } from "@fathym/cli";

const spinner: Spinner = {
  Frames: ["◜", "◠", "◝", "◞", "◡", "◟"],
  Interval: 80, // milliseconds between frames
};
```

### Using Spinners

```typescript
import { ArcSpinner, DotsSpinner, WindowsSpinner } from "@fathym/cli";

class SpinnerRunner {
  private frameIndex = 0;
  private intervalId?: number;

  start(spinner: Spinner, message: string) {
    this.intervalId = setInterval(() => {
      const frame = spinner.Frames[this.frameIndex];
      Deno.stdout.writeSync(
        new TextEncoder().encode(`\r${frame} ${message}`),
      );
      this.frameIndex = (this.frameIndex + 1) % spinner.Frames.length;
    }, spinner.Interval);
  }

  stop(message: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      Deno.stdout.writeSync(
        new TextEncoder().encode(`\r✓ ${message}\n`),
      );
    }
  }
}

// Usage
const spinner = new SpinnerRunner();
spinner.start(ArcSpinner, "Installing dependencies...");
await install();
spinner.stop("Dependencies installed");
```

### Platform-Aware Spinners

Choose spinner based on platform:

```typescript
import { ArcSpinner, DotsSpinner, WindowsSpinner } from "@fathym/cli";

function getSpinner() {
  if (Deno.build.os === "windows") {
    return WindowsSpinner;
  }
  // Check if terminal supports Unicode
  const term = Deno.env.get("TERM") ?? "";
  if (term.includes("xterm") || term.includes("256color")) {
    return DotsSpinner;
  }
  return ArcSpinner;
}

const spinner = getSpinner();
```

### Custom Spinners

Create custom spinner animations:

```typescript
import type { Spinner } from "@fathym/cli";

// Clock spinner
const ClockSpinner: Spinner = {
  Frames: [
    "🕐",
    "🕑",
    "🕒",
    "🕓",
    "🕔",
    "🕕",
    "🕖",
    "🕗",
    "🕘",
    "🕙",
    "🕚",
    "🕛",
  ],
  Interval: 100,
};

// Growing dots
const GrowingDotsSpinner: Spinner = {
  Frames: [".", "..", "...", "....", "....."],
  Interval: 200,
};

// Bouncing ball
const BouncingSpinner: Spinner = {
  Frames: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  Interval: 80,
};
```

---

## CLITelemetryRenderer

The renderer handles styled output to stderr.

### Direct Usage

```typescript
import { CLITelemetryRenderer } from "@fathym/cli";

const renderer = new CLITelemetryRenderer();

renderer.render("info", "Starting process");
renderer.render("warn", "Config missing", { path: "./config.json" });
renderer.render("error", "Failed to connect");
renderer.render("success", "Operation complete");
```

### Custom Writer

Write to a custom destination:

```typescript
import { CLITelemetryRenderer } from "@fathym/cli";

// Write to stdout instead of stderr
const renderer = new CLITelemetryRenderer(Deno.stdout);

// Write to a file
const file = Deno.openSync("./cli.log", { write: true, create: true });
const fileRenderer = new CLITelemetryRenderer(file);
```

### Level Prefixes

| Level     | Prefix | Color  |
| --------- | ------ | ------ |
| `debug`   | …      | Cyan   |
| `info`    | ℹ      | Blue   |
| `warn`    | ⚠      | Yellow |
| `error`   | ✖      | Red    |
| `fatal`   | 💥     | Red    |
| `success` | ✅     | Green  |

---

## Styled Output

Use the Colors module for styled terminal output.

### Basic Colors

```typescript
import { Colors } from "@fathym/cli";

console.log(Colors.green("Success!"));
console.log(Colors.red("Error!"));
console.log(Colors.yellow("Warning!"));
console.log(Colors.blue("Info"));
console.log(Colors.cyan("Debug"));
```

### Text Styles

```typescript
import { Colors } from "@fathym/cli";

console.log(Colors.bold("Important"));
console.log(Colors.dim("Secondary"));
console.log(Colors.italic("Emphasis"));
console.log(Colors.underline("Underlined"));
console.log(Colors.strikethrough("Deprecated"));
```

### Combining Styles

```typescript
import { Colors } from "@fathym/cli";

// Chain styles
console.log(Colors.bold(Colors.red("Critical Error!")));
console.log(Colors.dim(Colors.cyan("Debug info")));
console.log(Colors.bold(Colors.underline("Section Header")));
```

### Conditional Styling

Respect user preferences:

```typescript
import { Colors } from "@fathym/cli";

const noColor = Deno.env.get("NO_COLOR") !== undefined;

function styled(text: string, styleFn: (s: string) => string): string {
  return noColor ? text : styleFn(text);
}

console.log(styled("Success!", Colors.green));
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// Good
Log.Info("Processing file..."); // Normal operation
Log.Warn("File may be outdated"); // Potential issue
Log.Error("File not found"); // Actual error
Log.Success("File processed"); // Completion

// Avoid
Log.Info("ERROR: Something failed"); // Use Log.Error instead
```

### 2. Keep Messages Concise

```typescript
// Good
Log.Info("Building 12 modules...");
Log.Success("Build complete in 2.3s");

// Too verbose
Log.Info(
  "The build process is now starting and will compile all TypeScript modules...",
);
```

### 3. Use Spinners for Long Operations

```typescript
async function deploy() {
  const spinner = startSpinner("Deploying...");
  try {
    await performDeployment();
    spinner.stop("Deployed successfully");
  } catch (error) {
    spinner.stop("Deployment failed");
    throw error;
  }
}
```

### 4. Provide Context in Errors

```typescript
// Good
Log.Error(`Failed to read ${filename}: ${error.message}`);

// Less helpful
Log.Error("Read failed");
```

### 5. Structured Attributes for Machine Parsing

```typescript
// For machine-parseable logs
logger.info("Request completed", {
  method: "POST",
  path: "/api/deploy",
  status: 200,
  duration: 1234,
});
```

---

## Related

- [Building Commands](./building-commands.md) - Command development
- [CLI Configuration](./cli-configuration.md) - Project setup
- [Utilities API](../api/utilities.md) - Utility functions

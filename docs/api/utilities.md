---
FrontmatterVersion: 1
DocumentType: API
Title: Utilities API Reference
Summary: API reference for CLI utility functions including logging, terminal control, and command execution.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Logging Guide
    Path: ../guides/logging-output.md
---

# Utilities API Reference

API reference for utility functions including log capture, command execution, terminal control, and configuration helpers.

## Log Capture

### captureLogs

Capture all console and telemetry output during a function execution.

```typescript
import { captureLogs } from "@fathym/cli";
```

#### Signature

```typescript
function captureLogs(
  fn: () => Promise<void>,
  useOrig?: boolean,
): Promise<string>;
```

| Parameter | Type                  | Default | Description                    |
| --------- | --------------------- | ------- | ------------------------------ |
| `fn`      | `() => Promise<void>` | -       | Async function to execute      |
| `useOrig` | `boolean`             | `false` | Also write to original console |

**Returns:** Promise resolving to captured output string

#### Usage

```typescript
const output = await captureLogs(async () => {
  console.log("Hello");
  console.error("World");
});

console.log(output); // "Hello\nWorld\n"
```

#### Testing Commands

```typescript
import { captureLogs, CLI } from "@fathym/cli";

Deno.test("command output", async () => {
  const output = await captureLogs(async () => {
    await cli.run(["greet", "World"]);
  });

  assert(output.includes("Hello, World"));
});
```

#### With Original Output

Pass `true` to also display output during capture:

```typescript
const output = await captureLogs(async () => {
  console.log("Processing...");
}, true); // Also shows in terminal
```

---

## Command Execution

### runCommandWithLogs

Execute a shell command with output routed to the command logger.

```typescript
import { runCommandWithLogs } from "@fathym/cli";
```

#### Signature

```typescript
async function runCommandWithLogs(
  args: string[],
  log: CommandLog,
  options: {
    command?: string;
    exitOnFail?: boolean;
    stdin?: "inherit" | "null";
    prefix?: string;
    cwd: string;
  },
): Promise<{ code: number; success: boolean }>;
```

| Option       | Type                  | Default     | Description                   |
| ------------ | --------------------- | ----------- | ----------------------------- |
| `command`    | `string`              | `'deno'`    | Executable to run             |
| `exitOnFail` | `boolean`             | `true`      | Exit process on non-zero code |
| `stdin`      | `'inherit' \| 'null'` | `'inherit'` | Stdin handling                |
| `prefix`     | `string`              | `''`        | Prefix for log output         |
| `cwd`        | `string`              | (required)  | Working directory             |

**Returns:** Object with `code` and `success`

#### Usage

```typescript
Command("build", "Build the project")
  .Params(BuildParams)
  .Run(async ({ Log }) => {
    const result = await runCommandWithLogs(
      ["task", "build"],
      Log,
      {
        cwd: Deno.cwd(),
        prefix: "[build] ",
      },
    );

    if (result.success) {
      Log.Success("Build complete");
    }
  });
```

### runWithPassthroughLogs

Execute a Deno.Command with output passthrough.

```typescript
import { runWithPassthroughLogs } from "@fathym/cli";
```

#### Signature

```typescript
async function runWithPassthroughLogs(
  cmd: Deno.Command,
  log: CommandLog,
  options?: {
    exitOnFail?: boolean;
    prefix?: string;
  },
): Promise<{ code: number; success: boolean }>;
```

| Option       | Type      | Default | Description          |
| ------------ | --------- | ------- | -------------------- |
| `exitOnFail` | `boolean` | `true`  | Exit on failure      |
| `prefix`     | `string`  | `''`    | Prefix for log lines |

#### Usage

```typescript
const cmd = new Deno.Command("npm", {
  args: ["install"],
  stdout: "piped",
  stderr: "piped",
});

const result = await runWithPassthroughLogs(cmd, Log, {
  prefix: "[npm] ",
  exitOnFail: false,
});
```

---

## Terminal Control

### clearLine

Clear terminal lines using ANSI escape codes.

```typescript
import { clearLine } from "@fathym/cli";
```

#### Signature

```typescript
function clearLine(
  writer: WriterSync,
  encoder: TextEncoder,
  lineCount?: number,
  startLine?: number,
): void;
```

| Parameter   | Type          | Default   | Description                       |
| ----------- | ------------- | --------- | --------------------------------- |
| `writer`    | `WriterSync`  | -         | Output writer (e.g., Deno.stdout) |
| `encoder`   | `TextEncoder` | -         | Text encoder                      |
| `lineCount` | `number`      | `1`       | Number of lines to clear          |
| `startLine` | `number`      | (current) | Line to start clearing from       |

#### Usage

```typescript
const encoder = new TextEncoder();

// Clear one line
clearLine(Deno.stdout, encoder);

// Clear 3 lines
clearLine(Deno.stdout, encoder, 3);

// Clear from specific line
clearLine(Deno.stdout, encoder, 1, 5);
```

### hideCursor

Hide the terminal cursor.

```typescript
import { hideCursor } from "@fathym/cli";
```

#### Signature

```typescript
function hideCursor(writer: WriterSync, encoder: TextEncoder): void;
```

#### Usage

```typescript
const encoder = new TextEncoder();

hideCursor(Deno.stdout, encoder);

try {
  // Show spinner or animated output
  await showProgress();
} finally {
  showCursor(Deno.stdout, encoder);
}
```

### showCursor

Show the terminal cursor (after hiding it).

```typescript
import { showCursor } from "@fathym/cli";
```

#### Signature

```typescript
function showCursor(writer: WriterSync, encoder: TextEncoder): void;
```

#### Usage

```typescript
const encoder = new TextEncoder();

// Always restore cursor on exit
Deno.addSignalListener("SIGINT", () => {
  showCursor(Deno.stdout, encoder);
  Deno.exit(1);
});
```

---

## Styling Utilities

### appendStyles

Apply a style option to a text string.

```typescript
import { appendStyles } from "@fathym/cli";
```

#### Signature

```typescript
function appendStyles(text: string, styleKey: StyleOptions): string;
```

| Parameter  | Type           | Description                                         |
| ---------- | -------------- | --------------------------------------------------- |
| `text`     | `string`       | Text to style                                       |
| `styleKey` | `StyleOptions` | Style option (e.g., 'bold', 'red', 'rgb24:255:0:0') |

**Returns:** Styled text string with ANSI codes

#### Usage

```typescript
import { appendStyles } from "@fathym/cli";

// Basic style
const bold = appendStyles("Hello", "bold");

// Color
const red = appendStyles("Error", "red");

// RGB color
const orange = appendStyles("Warning", "rgb24:255:128:0");

// Chain styles
let text = "Important";
text = appendStyles(text, "bold");
text = appendStyles(text, "yellow");
```

### buildTextContent

Build a styled string from a TextContent object or plain string.

```typescript
import { buildTextContent } from "@fathym/cli";
```

#### Signature

```typescript
function buildTextContent(content?: string | TextContent): string;
```

| Parameter | Type                    | Description                        |
| --------- | ----------------------- | ---------------------------------- |
| `content` | `string \| TextContent` | Plain string or TextContent object |

**Returns:** Styled text string

#### Usage

```typescript
import { buildTextContent } from "@fathym/cli";

// Plain string
const text1 = buildTextContent("Hello");

// With styles
const text2 = buildTextContent({
  Text: "Success!",
  Styles: ["green", "bold"],
});

// Multiple styles
const text3 = buildTextContent({
  Text: "Warning",
  Styles: ["yellow", "underline"],
});
```

---

## Schema Utilities

### emitSchema

Emit a Zod schema as a JSON Schema file.

```typescript
import { emitSchema } from "@fathym/cli";
```

#### Signature

```typescript
async function emitSchema(
  schema: ZodType,
  schemaName: string,
  outputDir?: string,
): Promise<void>;
```

| Parameter    | Type      | Default       | Description           |
| ------------ | --------- | ------------- | --------------------- |
| `schema`     | `ZodType` | -             | Zod schema to convert |
| `schemaName` | `string`  | -             | Name for output file  |
| `outputDir`  | `string`  | `'./schemas'` | Output directory      |

#### Usage

```typescript
import { emitSchema } from "@fathym/cli";
import { z } from "zod";

const ConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  debug: z.boolean().optional(),
});

// Emits to ./schemas/config.schema.json
await emitSchema(ConfigSchema, "config");

// Custom output directory
await emitSchema(ConfigSchema, "config", "./dist/schemas");
```

---

## Module Utilities

### importModule

Dynamically import a module from a DFS with support for compiled mode.

```typescript
import { importModule } from "@fathym/cli";
```

#### Signature

```typescript
async function importModule<T = unknown>(
  log: CommandLog,
  filePath: string,
  rootDFS: DFSFileHandler,
  buildDFS: DFSFileHandler,
): Promise<T>;
```

| Parameter  | Type             | Description                    |
| ---------- | ---------------- | ------------------------------ |
| `log`      | `CommandLog`     | Logger for output              |
| `filePath` | `string`         | Path to module file            |
| `rootDFS`  | `DFSFileHandler` | Root DFS for source resolution |
| `buildDFS` | `DFSFileHandler` | Build DFS for compiled output  |

**Returns:** Imported module

#### Usage

```typescript
import { CLIDFSContextManager, importModule } from "@fathym/cli";

const dfsCtx = await ioc.Resolve(CLIDFSContextManager);
const rootDfs = await dfsCtx.GetProjectDFS();
const buildDfs = await dfsCtx.GetDFS("build");

// Import TypeScript module (bundles if compiled)
const config = await importModule<{ default: Config }>(
  Log,
  "config.ts",
  rootDfs,
  buildDfs,
);
```

**Behavior:**

- In development: Directly imports TypeScript files
- In compiled mode: Bundles `.ts` to `.js` via `deno bundle`, then imports via Blob URL

---

## Configuration Helpers

### normalizeCommandSources

Normalize the Commands config to a consistent array format.

```typescript
import { normalizeCommandSources } from "@fathym/cli";
```

#### Signature

```typescript
function normalizeCommandSources(
  commands: string | CLICommandSource[] | undefined,
): CLICommandSource[];
```

| Input                      | Output                         |
| -------------------------- | ------------------------------ |
| `undefined`                | `[{ Path: './commands' }]`     |
| `'./src/commands'`         | `[{ Path: './src/commands' }]` |
| `[{ Path: './commands' }]` | `[{ Path: './commands' }]`     |

#### Usage

```typescript
import { normalizeCommandSources } from "@fathym/cli";

const config = JSON.parse(await Deno.readTextFile(".cli.json"));

// Always get an array
const sources = normalizeCommandSources(config.Commands);

for (const source of sources) {
  console.log(`Loading commands from ${source.Path}`);
}
```

---

## Testing Helpers

### createTestCLI

Create a CLI instance for testing.

```typescript
import { createTestCLI } from "@fathym/cli";
```

#### Signature

```typescript
function createTestCLI(): CLI;
```

**Returns:** A new CLI instance with default options

#### Usage

```typescript
import { captureLogs, createTestCLI } from "@fathym/cli";

Deno.test("CLI integration", async () => {
  const cli = createTestCLI();

  const output = await captureLogs(async () => {
    await cli.run(["help"]);
  });

  assert(output.includes("Available Commands"));
});
```

---

## Spinner Helpers

Combine terminal control with spinners for progress indication:

```typescript
import { ArcSpinner, clearLine, hideCursor, showCursor } from "@fathym/cli";

async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  const encoder = new TextEncoder();
  const spinner = ArcSpinner;
  let frameIndex = 0;

  hideCursor(Deno.stdout, encoder);

  const interval = setInterval(() => {
    clearLine(Deno.stdout, encoder);
    const frame = spinner.Frames[frameIndex];
    Deno.stdout.writeSync(encoder.encode(`${frame} ${message}`));
    frameIndex = (frameIndex + 1) % spinner.Frames.length;
  }, spinner.Interval);

  try {
    const result = await fn();
    clearInterval(interval);
    clearLine(Deno.stdout, encoder);
    Deno.stdout.writeSync(encoder.encode(`✓ ${message}\n`));
    return result;
  } catch (error) {
    clearInterval(interval);
    clearLine(Deno.stdout, encoder);
    Deno.stdout.writeSync(encoder.encode(`✗ ${message}\n`));
    throw error;
  } finally {
    showCursor(Deno.stdout, encoder);
  }
}

// Usage
await withSpinner("Installing dependencies...", async () => {
  await runCommand(["npm", "install"]);
});
```

---

## Utility Patterns

### Safe Command Execution

```typescript
async function safeRun(
  args: string[],
  log: CommandLog,
  cwd: string,
): Promise<boolean> {
  try {
    const { success } = await runCommandWithLogs(args, log, {
      cwd,
      exitOnFail: false,
    });
    return success;
  } catch (error) {
    log.Error(`Failed: ${error.message}`);
    return false;
  }
}
```

### Capture with Timeout

```typescript
async function captureWithTimeout(
  fn: () => Promise<void>,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await captureLogs(fn);
  } catch (error) {
    if (error.name === "AbortError") {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

### Multi-Line Progress

```typescript
function updateProgress(lines: string[]) {
  const encoder = new TextEncoder();

  // Clear previous lines
  clearLine(Deno.stdout, encoder, lines.length);

  // Write new lines
  for (const line of lines) {
    Deno.stdout.writeSync(encoder.encode(line + "\n"));
  }
}

// Usage
updateProgress([
  "📦 Installing: package-a",
  "📦 Installing: package-b",
  "✓ Completed: 5/10",
]);
```

---

## Related

- [Logging Guide](../guides/logging-output.md) - Logging and output patterns
- [Testing Commands](../guides/testing-commands.md) - Testing with captureLogs
- [Building Commands](../guides/building-commands.md) - Command development

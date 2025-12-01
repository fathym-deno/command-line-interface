---
FrontmatterVersion: 1
DocumentType: API
Title: Styling API Reference
Summary: API reference for terminal text styling and inline updates.
Created: 2025-11-30
Updated: 2025-11-30
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Spinners API
    Path: ./spinners.md
---

# Styling API Reference

API reference for terminal text styling, inline updates, and ANSI color support.

## Overview

The styling module provides utilities for colored terminal output and in-place text updates during CLI operations.

```typescript
import { StyleOptions, TextContent, UpdateInline } from "@fathym/cli";
```

---

## UpdateInline

Class for updating text in-place in the terminal. Useful for progress indicators, status updates, and spinners.

```typescript
import { UpdateInline } from "@fathym/cli";
```

### Constructor

```typescript
new UpdateInline();
```

Creates a new inline update controller.

### Methods

#### Configure

```typescript
Configure(options: UpdateInlineOptions | string): this
```

Configure and render the inline text. If text already exists, clears the previous output first.

| Parameter | Type                            | Description                                |
| --------- | ------------------------------- | ------------------------------------------ |
| `options` | `UpdateInlineOptions \| string` | Configuration object or simple text string |

**Returns:** `this` (for chaining)

```typescript
const inline = new UpdateInline();

// Simple text
inline.Configure("Loading...");

// With options
inline.Configure({
  Text: "Processing files...",
  Styles: ["cyan", "bold"],
  PrefixText: "→",
});

// Update in place
inline.Configure({
  Text: "Complete!",
  Styles: "green",
});
```

### Properties

#### LastInlined

```typescript
LastInlined: string;
```

The last rendered text content.

---

## UpdateInlineOptions

Configuration options for `UpdateInline.Configure()`.

```typescript
import type { UpdateInlineOptions } from "@fathym/cli";
```

| Property     | Type                             | Default       | Description                     |
| ------------ | -------------------------------- | ------------- | ------------------------------- |
| `Text`       | `string \| TextContent`          | -             | Main text to display            |
| `PrefixText` | `string \| TextContent`          | -             | Text before main content        |
| `SuffixText` | `string \| TextContent`          | -             | Text after main content         |
| `Styles`     | `StyleOptions \| StyleOptions[]` | -             | Styles to apply to first line   |
| `Spinner`    | `boolean`                        | -             | Enable spinner animation        |
| `Columns`    | `number`                         | `100`         | Maximum line width              |
| `LineSpacer` | `string`                         | `' '`         | Separator between content parts |
| `Writer`     | `WriterSync`                     | `Deno.stderr` | Output writer                   |

```typescript
inline.Configure({
  PrefixText: "✓",
  Text: "Task completed",
  Styles: ["green", "bold"],
  Columns: 80,
});
```

---

## TextContent

Type for styled text segments.

```typescript
import type { TextContent } from "@fathym/cli";
```

```typescript
type TextContent = {
  /** Style(s) to apply */
  Styles?: StyleOptions | StyleOptions[];

  /** The text content */
  Text: string;
};
```

**Usage:**

```typescript
inline.Configure({
  PrefixText: { Text: "→", Styles: "cyan" },
  Text: { Text: "Building project", Styles: ["white", "bold"] },
  SuffixText: { Text: "(3/10)", Styles: "dim" },
});
```

---

## StyleOptions

Available text styling options. Based on Deno's `std/fmt/colors` module.

```typescript
import type { RGBStyleOptions, StyleKeys, StyleOptions } from "@fathym/cli";
```

### Basic Styles

| Style           | Description        |
| --------------- | ------------------ |
| `bold`          | Bold text          |
| `dim`           | Dimmed/faint text  |
| `italic`        | Italic text        |
| `underline`     | Underlined text    |
| `inverse`       | Inverted colors    |
| `hidden`        | Hidden text        |
| `strikethrough` | Strikethrough text |

### Foreground Colors

| Color     | Bright Variant  |
| --------- | --------------- |
| `black`   | `brightBlack`   |
| `red`     | `brightRed`     |
| `green`   | `brightGreen`   |
| `yellow`  | `brightYellow`  |
| `blue`    | `brightBlue`    |
| `magenta` | `brightMagenta` |
| `cyan`    | `brightCyan`    |
| `white`   | `brightWhite`   |

### Background Colors

| Color       | Bright Variant    |
| ----------- | ----------------- |
| `bgBlack`   | `bgBrightBlack`   |
| `bgRed`     | `bgBrightRed`     |
| `bgGreen`   | `bgBrightGreen`   |
| `bgYellow`  | `bgBrightYellow`  |
| `bgBlue`    | `bgBrightBlue`    |
| `bgMagenta` | `bgBrightMagenta` |
| `bgCyan`    | `bgBrightCyan`    |
| `bgWhite`   | `bgBrightWhite`   |

### RGB Colors

Custom RGB colors using special syntax:

```typescript
// RGB24 (24-bit color) - format: rgb24:r:g:b
type RGB24 = `rgb24:${number}:${number}:${number}`;
type BgRGB24 = `bgRgb24:${number}:${number}:${number}`;

// RGB8 (8-bit color) - format: rgb8:colorCode
type RGB8 = `rgb8:${number}`;
type BgRGB8 = `bgRgb8:${number}`;
```

**Examples:**

```typescript
// 24-bit custom color
inline.Configure({
  Text: "Custom color",
  Styles: "rgb24:255:128:0", // Orange
});

// 8-bit color palette
inline.Configure({
  Text: "Palette color",
  Styles: "rgb8:196", // Red from 256-color palette
});

// Background color
inline.Configure({
  Text: "Highlighted",
  Styles: "bgRgb24:50:50:50",
});
```

---

## Usage Patterns

### Progress Indicator

```typescript
const progress = new UpdateInline();

for (let i = 0; i <= 100; i += 10) {
  progress.Configure({
    Text: `Processing: ${i}%`,
    Styles: i === 100 ? "green" : "cyan",
  });
  await new Promise((r) => setTimeout(r, 100));
}
```

### Status Updates

```typescript
const status = new UpdateInline();

status.Configure({
  PrefixText: "⏳",
  Text: "Connecting...",
  Styles: "yellow",
});

// After connection
status.Configure({
  PrefixText: "✓",
  Text: "Connected",
  Styles: "green",
});
```

### Multi-styled Content

```typescript
inline.Configure({
  PrefixText: { Text: "[INFO]", Styles: ["cyan", "bold"] },
  Text: { Text: "Operation completed successfully", Styles: "white" },
  SuffixText: { Text: "(2.3s)", Styles: "dim" },
});
```

---

## Source Files

- [UpdateInline.ts](../../src/styling/UpdateInline.ts) - Main update class
- [UpdateInlineOptions.ts](../../src/styling/UpdateInlineOptions.ts) - Options type
- [TextContent.ts](../../src/styling/TextContent.ts) - Text content type
- [StyleKeys.ts](../../src/styling/StyleKeys.ts) - Style option types

---

## Related

- [Spinners API](./spinners.md) - Spinner animations
- [Utilities API](./utilities.md) - Terminal utilities
- [Commands API](./commands.md) - Using Log in commands

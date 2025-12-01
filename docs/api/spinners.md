---
FrontmatterVersion: 1
DocumentType: API
Title: Spinners API Reference
Summary: API reference for spinner animations used in CLI loading indicators.
Created: 2025-11-30
Updated: 2025-11-30
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Styling API
    Path: ./styling.md
---

# Spinners API Reference

API reference for spinner animations used in CLI loading indicators and progress displays.

## Overview

Spinners provide visual feedback during long-running operations. The framework includes several pre-built spinner configurations optimized for different terminal environments.

```typescript
import { DotsSpinner, ArcSpinner, WindowsSpinner } from '@fathym/cli';
```

---

## Spinner Type

The base type definition for all spinners:

```typescript
type Spinner = {
  /** Animation frames to cycle through */
  Frames: string[];

  /** Milliseconds between frame updates */
  Interval: number;
};
```

| Property | Type | Description |
|----------|------|-------------|
| `Frames` | `string[]` | Array of characters/strings to cycle through |
| `Interval` | `number` | Delay between frames in milliseconds |

---

## Built-in Spinners

### DotsSpinner

Braille-based spinner with smooth animation. Best for Unix terminals with full Unicode support.

```typescript
import { DotsSpinner } from '@fathym/cli';

const spinner: Spinner = DotsSpinner;
// Frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
// Interval: 80ms
```

**Visual Preview:**
```
⠋ Loading...
⠙ Loading...
⠹ Loading...
```

### ArcSpinner

Arc-based spinner with circular motion. Good alternative for terminals without full braille support.

```typescript
import { ArcSpinner } from '@fathym/cli';

const spinner: Spinner = ArcSpinner;
// Frames: ['◜', '◠', '◝', '◞', '◡', '◟']
// Interval: 80ms
```

**Visual Preview:**
```
◜ Processing...
◠ Processing...
◝ Processing...
```

### WindowsSpinner

Classic ASCII spinner. Compatible with all terminals including Windows Command Prompt.

```typescript
import { WindowsSpinner } from '@fathym/cli';

const spinner: Spinner = WindowsSpinner;
// Frames: ['/', '-', '\\', '|']
// Interval: 80ms
```

**Visual Preview:**
```
/ Working...
- Working...
\ Working...
```

---

## Creating Custom Spinners

Create custom spinners by implementing the `Spinner` type:

```typescript
import type { Spinner } from '@fathym/cli';

// Clock spinner
const ClockSpinner: Spinner = {
  Frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
  Interval: 100,
};

// Bouncing ball
const BouncingSpinner: Spinner = {
  Frames: ['⠁', '⠂', '⠄', '⠂'],
  Interval: 120,
};

// Growing dots
const GrowingSpinner: Spinner = {
  Frames: ['.  ', '.. ', '...', '.. '],
  Interval: 300,
};
```

---

## Usage with UpdateInline

Spinners integrate with the `UpdateInline` class for terminal-based progress indicators:

```typescript
import { UpdateInline, DotsSpinner } from '@fathym/cli';

const inline = new UpdateInline();

inline.Configure({
  Text: 'Processing...',
  Spinner: true,  // Uses default spinner
});

// Update text during operation
inline.Configure({
  Text: 'Almost done...',
});
```

> **Note:** Custom spinner frames in `UpdateInlineOptions` are not yet supported. Use `Spinner: true` for the default behavior.

---

## Platform Recommendations

| Platform | Recommended Spinner | Reason |
|----------|---------------------|--------|
| macOS/Linux | `DotsSpinner` | Full Unicode support |
| Windows Terminal | `DotsSpinner` | Modern Unicode support |
| Windows CMD | `WindowsSpinner` | ASCII-only compatibility |
| SSH sessions | `ArcSpinner` | Compact, reliable |

---

## Source Files

- [Spinner.ts](../../src/spinners/Spinner.ts) - Type definition
- [DotsSpinner.ts](../../src/spinners/DotsSpinner.ts) - Braille spinner
- [ArcSpinner.ts](../../src/spinners/ArcSpinner.ts) - Arc spinner
- [WindowsSpinner.ts](../../src/spinners/WindowsSpinner.ts) - ASCII spinner

---

## Related

- [Styling API](./styling.md) - Text styling and inline updates
- [Utilities API](./utilities.md) - Terminal utilities

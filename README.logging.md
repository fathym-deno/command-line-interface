---
FrontmatterVersion: 1
DocumentType: Guide
Title: CLI Logging & Telemetry
Summary: How the Fathym CLI renders logs via telemetry-backed adapters.
Created: 2025-11-20
Updated: 2025-11-20
Owners:
  - fathym
References:
  - Label: Project README
    Path: ./README.md
  - Label: Project Agents Guide
    Path: ./AGENTS.md
  - Label: Project Guide
    Path: ./GUIDE.md
---

# CLI Logging & Telemetry

The CLI no longer writes directly to `console.*`. All command logs flow through a telemetry-backed logger that renders “pretty” CLI output (colors, icons, inline updates) while preserving structured attributes for downstream export.

## How it works

- A CLI-scoped `TelemetryLogger` is registered in `CLI.registerTelemetry`, with base attributes `{ cliName, cliVersion }`. Tests can inject a writer via IoC (`TelemetryWriter`) or `globalThis.__telemetryWriter`.
- `CLICommandExecutor` uses `TelemetryLogAdapter` to emit `Info/Warn/Error/Success` with command context (e.g., `commandKey`).
- The logger is implemented by `createCliTelemetryLogger`, which uses `CLITelemetryRenderer` to write styled lines to stderr (or the injected writer).

## Authoring commands

- Continue using the `Log` object provided in `CommandContext` (`Info/Warn/Error/Success`). It is telemetry-backed—no direct `console.*`.
- Prefer concise messages; the renderer prepends level icons and keeps attributes alongside for potential exporters.

## Testing

- `captureLogs` captures renderer output by providing an in-memory writer (`__telemetryWriter`) and still patches `console.*` for legacy emitters. Assertions should match rendered text (no hard-coded emojis).

## Extending

- To hook a different sink, register a `TelemetryWriter` in IoC before running the CLI, or extend `createCliTelemetryLogger`/`CLITelemetryRenderer` for richer spinners/inline updates. Structured attributes are preserved on each call.

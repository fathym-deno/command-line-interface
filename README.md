---
FrontmatterVersion: 1
DocumentType: Guide
Title: Fathym Command-Line Interface
Summary: CLI for managing Fathym runtimes, scaffolding projects, and operating local workloads.
Created: 2025-11-20
Updated: 2025-11-20
Owners:
  - fathym
References:
  - Label: Projects: Ref-Arch README
      Path: ../README.md
  - Label: Projects: Ref-Arch AGENTS
      Path: ../AGENTS.md
  - Label: Projects: Ref-Arch Guide
      Path: ../GUIDE.md
  - Label: Root README
    Path: ../../../README.md
  - Label: Root Agents Guide
    Path: ../../../AGENTS.md
  - Label: Root Workspace Guide
    Path: ../../../WORKSPACE_GUIDE.md
  - Label: Project Agents Guide
    Path: ./AGENTS.md
  - Label: Project Guide
    Path: ./GUIDE.md
---

# Fathym Command-Line Interface

CLI for working with Fathym runtimes and micro-frameworks—covering scaffolding, project management, local development workflows, and operational utilities.

- **Goal:** deliver a reliable CLI that automates common platform tasks (project setup, environment bootstrap, build/test/deploy flows).
- **Outputs:** design notes, command reference, release packaging, and sample scripts showing usage across projects.
- **Code location:** `projects/ref-arch/command-line-interface/` (CLI runtime, commands/templates, tests, and runtime scripts).

## Current Status

- CLI runtime, commands, and tests moved here from `@fathym/common`; schema emission and runtime scripts live in `./scripts`.
- Depends on `@fathym/common` for core utilities and `@fathym/dfs` for file system abstractions.
- Packaging tasks and compile/run helpers defined in `deno.jsonc`; adjust for release targets as needed.

## How to Work in This Pod

1. Review the root and portfolio Instruction Documents plus this project’s [`AGENTS`](./AGENTS.md) and [`GUIDE`](./GUIDE.md).
2. Declare intent before editing; summarize outcomes and open questions in a short log or in this README.
3. Capture upstream provenance, release channels, and packaging details in `UPSTREAM.md` once known.
4. Keep links relative; reference implementation repos/branches when selected.
5. Record prompts or scripts used when designing commands or automations.

## Features

### Schema Validation & Complex Type Resolution

The CLI framework includes built-in runtime validation:

- **Schema Validation**: Args and flags are validated against Zod schemas at runtime (not just help text)
- **Complex Type Resolution**: `ZodObject`/`ZodArray` flags automatically resolve from file paths or inline JSON
- **fileCheck Meta**: Control resolution with `.meta({ fileCheck: true/false })`
- **`.Validate()` Hook**: Add custom validation with access to `RootValidate()` callback

```typescript
// Complex types auto-resolve from files or inline JSON
const FlagsSchema = z.object({
  config: z.object({ host: z.string(), port: z.number() }), // --config ./config.json OR --config '{"host":"x"}'
  name: z.string(),
});

Command("deploy", "Deploy application")
  .Flags(FlagsSchema)
  .Validate(async ({ Params, RootValidate }) => {
    const result = await RootValidate();
    if (!result.success) return result;
    // Custom validation after schema validation
    return { success: true };
  })
  .Run(async ({ Params }) => {
    const config = Params.Flag("config"); // Already parsed object!
  })
  .Build();
```

See [docs/api/validation.md](docs/api/validation.md) for complete documentation.

## Related Projects

- Fathym CLI (open-source): `projects/open-source/fathym-cli` now hosts the `ftm` commands/templates/docs. Use `@fathym/cli` runtime from this repo as the dependency.

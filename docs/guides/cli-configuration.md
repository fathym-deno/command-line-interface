---
FrontmatterVersion: 1
DocumentType: Guide
Title: CLI Configuration Guide
Summary: Complete guide to configuring CLIs with .cli.json and .cli.init.ts files.
Created: 2025-11-29
Updated: 2025-11-29
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Getting Started
    Path: ./getting-started.md
---

# CLI Configuration Guide

This guide covers the configuration files that define your CLI's identity, structure, and initialization.

## Configuration Files Overview

| File           | Purpose                                  | Required |
| -------------- | ---------------------------------------- | -------- |
| `.cli.json`    | CLI identity, command sources, templates | Yes      |
| `.cli.init.ts` | IoC registration, service setup          | No       |

---

## .cli.json Schema

The `.cli.json` file defines your CLI's core configuration.

### Complete Schema

```typescript
interface CLIConfig {
  Name: string; // Display name (required)
  Tokens: string[]; // CLI invocation names (required)
  Version: string; // Semantic version (required)
  Description?: string; // Help text description
  Commands?: string | CLICommandSource[]; // Command sources
  Templates?: string; // Templates directory
  ConfigDFSName?: string; // Config directory name (e.g., ".mycli")
  ConfigDFSRoot?: string; // Explicit config root override
  ConfigDFSRootEnvVar?: string; // Custom env var for root override
}

interface CLICommandSource {
  Path: string; // Path to commands directory
  Root?: string; // Prefix for command keys
}
```

### Minimal Example

```json
{
  "Name": "My CLI",
  "Tokens": ["mycli"],
  "Version": "1.0.0"
}
```

### Full Example

```json
{
  "Name": "Open Industrial CLI",
  "Tokens": ["openindustrial", "oi"],
  "Version": "2.1.0",
  "Description": "Industrial automation and monitoring tools",
  "Commands": [
    { "Path": "./commands" },
    { "Path": "./plugins/commands", "Root": "plugin" }
  ],
  "Templates": "./templates",
  "ConfigDFSName": ".openindustrial"
}
```

---

## Configuration Properties

### Name (required)

User-facing display name shown in help output.

```json
{
  "Name": "My Awesome CLI"
}
```

Output:

```
📘 My Awesome CLI v1.0.0
```

### Tokens (required)

Array of names that can invoke the CLI. The first token is primary.

```json
{
  "Tokens": ["openindustrial", "oi"]
}
```

Both work:

```bash
openindustrial deploy
oi deploy
```

### Version (required)

Semantic version string shown in help and logs.

```json
{
  "Version": "2.1.0"
}
```

### Description (optional)

Description shown in the root help output.

```json
{
  "Description": "Tools for industrial automation and monitoring"
}
```

### Commands (optional)

Where to find command modules. Defaults to `./commands`.

**Simple string:**

```json
{
  "Commands": "./src/commands"
}
```

**Multiple sources with prefixes:**

```json
{
  "Commands": [
    { "Path": "./commands" },
    { "Path": "./plugins/v1", "Root": "legacy" },
    { "Path": "./plugins/v2", "Root": "plugin" }
  ]
}
```

### Templates (optional)

Directory containing template files. Defaults to `./templates`.

```json
{
  "Templates": "./assets/templates"
}
```

---

## ConfigDFS (User Configuration Storage)

ConfigDFS provides a standardized way to store user configuration files outside the project directory. When `ConfigDFSName` is set, the CLI automatically creates and manages a configuration directory.

### ConfigDFSName (optional)

The folder name for the config directory. When set, enables ConfigDFS.

```json
{
  "ConfigDFSName": ".mycli"
}
```

This creates `~/.mycli/` (or custom location - see precedence below).

### ConfigDFSRoot (optional)

Explicit root directory override. Useful for testing or custom deployments.

```json
{
  "ConfigDFSName": ".mycli",
  "ConfigDFSRoot": "/data/mycli-config"
}
```

Result: `/data/mycli-config/.mycli/`

### ConfigDFSRootEnvVar (optional)

Custom environment variable name for root override.

```json
{
  "ConfigDFSName": ".mycli",
  "ConfigDFSRootEnvVar": "MYCLI_DATA_DIR"
}
```

If `MYCLI_DATA_DIR=/custom/path`, config is at `/custom/path/.mycli/`.

**Special values:**

- `undefined` (default): Checks `{TOKEN}_CONFIG_ROOT` env var
- Empty string `""`: Disables all env var checking

### Root Resolution Precedence

ConfigDFS resolves the root directory in this order:

| Priority | Source                                                      | Example                    |
| -------- | ----------------------------------------------------------- | -------------------------- |
| 1        | Custom env var (if `ConfigDFSRootEnvVar` set and has value) | `MYCLI_DATA_DIR=/custom`   |
| 2        | Explicit root (if `ConfigDFSRoot` set)                      | `"ConfigDFSRoot": "/data"` |
| 3        | Default env var (if `ConfigDFSRootEnvVar` undefined)        | `MYCLI_CONFIG_ROOT=/alt`   |
| 4        | User home directory (fallback)                              | `~/.mycli/`                |

### Accessing ConfigDFS in Commands

```typescript
import { CLIDFSContextManager, Command, CommandParams } from "@fathym/cli";

export default Command("settings", "Manage user settings")
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(SettingsParams)
  .Services(async (_, ioc) => ({
    DfsCtx: await ioc.Resolve(CLIDFSContextManager),
  }))
  .Run(async ({ Services, Log }) => {
    const dfsCtx = await Services.DfsCtx;
    const configDfs = await dfsCtx.GetConfigDFS();

    // Read a config file
    const fileInfo = await configDfs.GetFileInfo("settings.json");
    if (fileInfo) {
      const content = await new Response(fileInfo.Contents).text();
      const settings = JSON.parse(content);
    }

    // Write a config file
    const path = await configDfs.ResolvePath("settings.json");
    await Deno.writeTextFile(path, JSON.stringify(settings, null, 2));
  });
```

### Full ConfigDFS Example

```json
{
  "Name": "Enterprise CLI",
  "Tokens": ["entcli"],
  "Version": "1.0.0",
  "ConfigDFSName": ".entcli",
  "ConfigDFSRoot": "/opt/entcli/config",
  "ConfigDFSRootEnvVar": "ENTCLI_CONFIG_DIR"
}
```

Resolution:

1. If `ENTCLI_CONFIG_DIR=/custom` → `/custom/.entcli/`
2. Else → `/opt/entcli/config/.entcli/`

---

## Command Source Configuration

### CLICommandSource

Each source specifies where to find commands and how to prefix their keys.

```typescript
interface CLICommandSource {
  Path: string; // Relative path to commands
  Root?: string; // Key prefix (can be nested: "ext/v2")
}
```

### Without Root Prefix

```json
{ "Path": "./commands" }
```

Directory structure:

```
./commands/
├── deploy.ts        → 'deploy'
├── build.ts         → 'build'
└── db/
    ├── migrate.ts   → 'db/migrate'
    └── seed.ts      → 'db/seed'
```

### With Root Prefix

```json
{ "Path": "./plugins", "Root": "ext" }
```

Directory structure:

```
./plugins/
├── run.ts           → 'ext/run'
├── test.ts          → 'ext/test'
└── db/
    └── migrate.ts   → 'ext/db/migrate'
```

### Nested Root Prefix

```json
{ "Path": "./v2-plugins", "Root": "plugin/v2" }
```

Commands become:

- `./v2-plugins/run.ts` → `'plugin/v2/run'`
- `./v2-plugins/test.ts` → `'plugin/v2/test'`

---

## .cli.init.ts

The initialization file registers services before any command runs.

### Function Signature

```typescript
import type { IoCContainer } from "@fathym/ioc";
import type { CLIConfig } from "@fathym/cli";

export default async function init(
  ioc: IoCContainer,
  config: CLIConfig,
): Promise<void> {
  // Register services here
}
```

### Basic Example

```typescript
// .cli.init.ts
import { IoCContainer } from "@fathym/ioc";
import type { CLIConfig } from "@fathym/cli";

export default async function init(
  ioc: IoCContainer,
  config: CLIConfig,
): Promise<void> {
  // Register a simple service
  ioc.Register("Logger", () => console);
}
```

### Service Registration Patterns

#### Register by Class

```typescript
import { DeployService } from "./services/DeployService.ts";

export default async function init(ioc: IoCContainer) {
  ioc.Register(DeployService, () => new DeployService());
}
```

#### Register by Symbol

```typescript
const ConfigSymbol = Symbol.for("Config");

export default async function init(ioc: IoCContainer, config: CLIConfig) {
  ioc.Register(ConfigSymbol, () => ({
    apiUrl: Deno.env.get("API_URL") ?? "https://api.example.com",
    version: config.Version,
  }));
}
```

#### Register with Dependencies

```typescript
import { HttpClient } from "./services/HttpClient.ts";
import { ApiService } from "./services/ApiService.ts";

export default async function init(ioc: IoCContainer) {
  // Register base service
  ioc.Register(HttpClient, () => new HttpClient());

  // Register dependent service
  ioc.Register(ApiService, async () => {
    const http = await ioc.Resolve(HttpClient);
    return new ApiService(http);
  });
}
```

### Resolving Services in Commands

Services registered in `.cli.init.ts` are available via the `.Services()` method:

```typescript
import { Command, CommandParams } from "@fathym/cli";
import type { IoCContainer } from "@fathym/cli";
import { z } from "zod";
import { DeployService } from "../services/DeployService.ts";

const ArgsSchema = z.tuple([z.string().describe("Target to deploy")]);

class DeployParams extends CommandParams<z.infer<typeof ArgsSchema>, {}> {
  get Target(): string {
    return this.Arg(0)!;
  }
}

export default Command("deploy", "Deploy application")
  .Args(ArgsSchema)
  .Flags(z.object({}))
  .Params(DeployParams)
  .Services(async (_ctx, ioc: IoCContainer) => ({
    deployer: await ioc.Resolve(DeployService),
  }))
  .Run(async ({ Params, Services }) => {
    await Services.deployer.deploy(Params.Target);
  });
```

---

## Configuration Validation

### Zod Schema

The framework validates configuration using Zod:

```typescript
import { CLIConfigSchema, isCLIConfig } from "@fathym/cli";

// Validate manually
const result = CLIConfigSchema.safeParse(jsonData);
if (!result.success) {
  console.error("Invalid config:", result.error);
}

// Type guard
if (isCLIConfig(data)) {
  console.log(data.Name); // Type-safe access
}
```

### Validation Errors

Common validation errors:

```
❌ CLI name is required.
❌ At least one CLI token is required.
❌ CLI version is required.
```

---

## Environment-Specific Configuration

### Using Environment Variables

In `.cli.init.ts`:

```typescript
export default async function init(ioc: IoCContainer, config: CLIConfig) {
  const env = Deno.env.get("CLI_ENV") ?? "development";

  ioc.Register("ApiConfig", () => ({
    baseUrl: env === "production"
      ? "https://api.example.com"
      : "https://staging.api.example.com",
    debug: env !== "production",
  }));
}
```

### Configuration Override

Commands can accept a `--config` flag for alternative config files:

```bash
mycli deploy --config ./custom.cli.json
```

Handle in your entry point:

```typescript
// Check for config override in args
const configArg = Deno.args.find((a) => a.startsWith("--config="));
const configPath = configArg?.split("=")[1] ?? ".cli.json";
```

---

## Project Structure Recommendations

### Standard Layout

```
my-cli/
├── .cli.json           # CLI configuration
├── .cli.init.ts        # Service registration
├── commands/           # Command modules
│   ├── deploy.ts
│   ├── build.ts
│   └── db/
│       ├── .metadata.ts
│       └── migrate.ts
├── services/           # Shared services
│   └── DeployService.ts
├── templates/          # File templates
│   └── config.json.template
└── deno.json           # Deno configuration
```

### Multiple Command Sources

```
my-cli/
├── .cli.json
├── commands/           # Core commands
│   └── ...
├── plugins/
│   ├── auth/           # Auth plugin commands
│   │   └── login.ts
│   └── db/             # Database plugin commands
│       └── migrate.ts
└── ...
```

`.cli.json`:

```json
{
  "Commands": [
    { "Path": "./commands" },
    { "Path": "./plugins/auth", "Root": "auth" },
    { "Path": "./plugins/db", "Root": "db" }
  ]
}
```

Results in:

- Core: `mycli deploy`
- Auth: `mycli auth login`
- DB: `mycli db migrate`

---

## Troubleshooting

### Config Not Found

```
❌ Unable to locate CLI config.
🧐 Tried: first arg and fallback '.cli.json'
👉 Create one or pass path explicitly.
```

**Solution:** Ensure `.cli.json` exists in the current directory or pass path explicitly.

### Commands Not Discovered

**Check:**

1. `Commands` path is correct relative to `.cli.json`
2. Command files export properly
3. File extension is `.ts`

### Init Function Not Loading

**Check:**

1. File is named `.cli.init.ts` in project root
2. Default export is an async function
3. No syntax errors in the file

---

## Related

- [Getting Started Guide](./getting-started.md) - Project setup
- [Building Commands Guide](./building-commands.md) - Command development
- [DFS API Reference](../api/dfs.md) - File system context
- [Advanced Infrastructure](./advanced-infrastructure.md) - Internal architecture

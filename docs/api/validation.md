# Validation API

The validation module provides schema-based validation and complex type resolution for CLI commands. It automatically validates arguments and flags against Zod schemas, resolves file paths to JSON objects, and supports custom validation logic.

## Overview

The validation system provides:
- **Schema Validation**: Validate args/flags against Zod schemas at runtime
- **Complex Type Resolution**: Automatically load objects/arrays from file paths or inline JSON
- **fileCheck Meta**: Control file resolution behavior via `.meta({ fileCheck: true/false })`
- **Custom Validation**: Add business logic via `.Validate()` hook with `RootValidate` callback pattern
- **Help Integration**: Show "(file path or inline JSON)" hints in help output

## Quick Start

```typescript
import { Command } from '@fathym/cli';
import { z } from 'zod';

// Define a complex config schema
const ConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  features: z.array(z.string()).optional(),
});

export default Command('deploy', 'Deploy with config')
  .Args(z.tuple([z.string().meta({ argName: 'environment' })]))
  .Flags(z.object({
    config: ConfigSchema.describe('Deployment configuration'),
    force: z.boolean().optional(),
  }))
  .Params(DeployParams)
  .Run(async ({ Params, Log }) => {
    // config is already resolved - either from file or inline JSON
    const config = Params.Flag('config');
    Log.Info(`Deploying to ${config.host}:${config.port}`);
  })
  .Build();
```

Users can now invoke:
```bash
# From file
mycli deploy prod --config ./deploy-config.json

# From inline JSON
mycli deploy prod --config '{"host":"localhost","port":3000}'
```

## Core Classes

### SchemaIntrospector

Analyzes Zod schemas to determine type information and metadata.

```typescript
import { SchemaIntrospector } from '@fathym/cli';
import { z } from 'zod';

const introspector = new SchemaIntrospector();

// Check if a schema is a complex type
introspector.isComplexType(z.object({})); // true
introspector.isComplexType(z.array(z.string())); // true
introspector.isComplexType(z.string()); // false

// Check if fileCheck is enabled
introspector.shouldFileCheck(z.object({})); // true (complex type auto opts-in)
introspector.shouldFileCheck(z.string()); // false (primitives default off)
introspector.shouldFileCheck(z.string().meta({ fileCheck: true })); // true (explicit)
introspector.shouldFileCheck(z.object({}).meta({ fileCheck: false })); // false (explicit disable)

// Get metadata
const meta = introspector.getMeta(z.string().meta({ argName: 'myArg' }));
// { argName: 'myArg' }
```

### ValueResolver

Resolves CLI values from file paths or inline JSON strings.

```typescript
import { ValueResolver } from '@fathym/cli';
import { z } from 'zod';

const resolver = new ValueResolver();

// Resolve from file path
const result1 = await resolver.resolve('./config.json', z.object({}));
// { success: true, value: { ...fileContents }, fromFile: true }

// Resolve from inline JSON
const result2 = await resolver.resolve('{"key":"value"}', z.object({}));
// { success: true, value: { key: 'value' }, fromFile: false }

// Primitive value passes through
const result3 = await resolver.resolve('hello', z.string());
// { success: true, value: 'hello', fromFile: false }
```

### SchemaValidator

Validates resolved values against Zod schemas.

```typescript
import { SchemaValidator } from '@fathym/cli';
import { z } from 'zod';

const validator = new SchemaValidator();

// Validate flags
const result = validator.validateFlags(
  { port: 3000, host: 'localhost' },
  z.object({ port: z.number(), host: z.string() })
);

if (!result.success) {
  console.error(validator.formatErrors(result.errors));
}
```

### ValidationPipeline

Orchestrates the complete validation flow.

```typescript
import { ValidationPipeline } from '@fathym/cli';

const pipeline = new ValidationPipeline();

const result = await pipeline.execute(
  ['deploy'],           // positional args
  { config: './c.json' }, // flags
  params,               // CommandParams instance
  {
    argsSchema: z.tuple([z.string()]),
    flagsSchema: z.object({ config: ConfigSchema }),
    log: consoleLog,
  }
);

if (!result.success) {
  console.error(pipeline.formatErrors(result));
}
```

## The `.Validate()` Hook

Add custom validation logic that integrates with schema validation:

```typescript
Command('deploy', 'Deploy application')
  .Args(ArgsSchema)
  .Flags(FlagsSchema)
  .Params(DeployParams)
  .Validate(async ({ Args, Flags, Params, Log, RootValidate }) => {
    // Run default schema validation first
    const result = await RootValidate();
    if (!result.success) return result;

    // Add custom validation
    if (Params.Flag('port') < 1024 && !Params.Flag('force')) {
      return {
        success: false,
        errors: [{ message: 'Privileged port requires --force flag' }],
      };
    }

    return { success: true };
  })
  .Run(...)
  .Build();
```

### Validation Patterns

**Pre-validation (check before schema)**:
```typescript
.Validate(async ({ Flags, RootValidate }) => {
  if (Flags['a'] && Flags['b']) {
    return { success: false, errors: [{ message: 'Cannot use both -a and -b' }] };
  }
  return await RootValidate();
})
```

**Post-validation (check after schema)**:
```typescript
.Validate(async ({ Params, RootValidate }) => {
  const result = await RootValidate();
  if (!result.success) return result;

  // Business logic validation
  if (Params.Flag('max') < Params.Flag('min')) {
    return { success: false, errors: [{ message: 'max must be >= min' }] };
  }
  return { success: true };
})
```

**Full custom control (skip RootValidate)**:
```typescript
.Validate(async ({ Flags }) => {
  // Completely custom validation
  return { success: true };
})
```

## fileCheck Behavior

### Auto Opt-In for Complex Types

Complex types (objects, arrays, records, maps) automatically enable file resolution:

```typescript
z.object({ key: z.string() })  // fileCheck: true (auto)
z.array(z.number())             // fileCheck: true (auto)
z.record(z.string())            // fileCheck: true (auto)
z.string()                      // fileCheck: false (default)
z.number()                      // fileCheck: false (default)
```

### Explicit Control with `.meta()`

Override defaults with metadata:

```typescript
// Disable file resolution for complex type
z.object({}).meta({ fileCheck: false })

// Enable file resolution for primitive
z.string().meta({ fileCheck: true })
```

### File Path Detection

A string is treated as a file path if it:
- Starts with `./` or `../` (relative paths)
- Starts with `/` (absolute Unix paths)
- Matches `C:\` pattern (Windows paths)
- Ends with `.json`, `.yaml`, `.yml`, or `.toml`

### Supported File Formats

- **JSON** (`.json`): Full support
- **YAML** (`.yaml`, `.yml`): JSON-compatible YAML only

## Help Output

When `fileCheck` is enabled, help output shows a hint:

```
Flags:
  --config - Deployment configuration (file path or inline JSON)
  --force - Force deployment
```

This is automatic for complex types and can be controlled via `.meta()`.

## Types

### ValidationResult

```typescript
interface ValidationResult {
  success: boolean;
  data?: { args: unknown[]; flags: Record<string, unknown> };
  errors?: ValidationError[];
}
```

### ValidationError

```typescript
interface ValidationError {
  path?: string[];
  message: string;
  code?: string;
}
```

### ValidateContext

```typescript
interface ValidateContext<A, F, P> {
  Args: A;
  Flags: F;
  Params: P;
  Log: CommandLog;
  RootValidate: () => Promise<ValidationResult>;
}
```

### SchemaFieldMeta

```typescript
interface SchemaFieldMeta {
  fileCheck?: boolean;
  argName?: string;
  flagName?: string;
  [key: string]: unknown;
}
```

## Best Practices

1. **Use descriptive error messages**: Include context about what failed and how to fix it
2. **Call RootValidate first**: Let schema validation catch type errors before business logic
3. **Leverage fileCheck for configs**: Complex configuration objects benefit from file support
4. **Disable fileCheck for secrets**: Sensitive data shouldn't be loaded from arbitrary files
5. **Document file formats**: Tell users which file formats are supported for each flag

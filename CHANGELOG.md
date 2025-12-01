# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Schema Validation**: Args and flags are now validated against Zod schemas at runtime (previously schemas were only used for help text generation)
- **Complex Type Resolution**: `ZodObject`/`ZodArray` flags automatically resolve from file paths or inline JSON strings, eliminating the need for separate `--input` and `--input-file` flags
- **fileCheck Meta**: Control resolution behavior with `.meta({ fileCheck: true/false })`:
  - Complex types (object, array, record, map) auto opt-in to `fileCheck: true`
  - Primitives default to `fileCheck: false`
  - Explicit meta overrides defaults
- **`.Validate()` Hook**: Add custom validation integrated into the validation phase with access to `{ Args, Flags, Params, Log, RootValidate }`. Users can:
  - Call `RootValidate()` to run default schema validation + resolution
  - Add validation before or after `RootValidate()`
  - Skip `RootValidate()` entirely for full custom control
- **Help Output Enhancement**: Flags/args with `fileCheck` enabled now show "(file path or inline JSON)" hint
- **Validation Module**: New `src/validation/` directory with:
  - `SchemaIntrospector` - Analyze Zod schemas for complex type detection and meta extraction
  - `ValueResolver` - Resolve values from file paths or inline JSON
  - `SchemaValidator` - Validate resolved values against Zod schemas
  - `ValidationPipeline` - Orchestrate the complete validation flow

### Changed

- `CommandModuleBuilder` now includes `.Validate()` method in fluent chain
- `CommandModule` type includes optional `Validate` callback
- `CommandModuleMetadata` args/flags include `AcceptsFile` property
- `CLICommandExecutor` integrates validation pipeline before params construction

## [0.1.0] - 2025-11-20

### Added

- Initial CLI framework release
- Command module builder with fluent API
- Schema-based help generation
- Command matching and routing
- Template scaffolding system
- Telemetry logging
- Subcommand support with groups

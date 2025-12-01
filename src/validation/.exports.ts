/**
 * Validation module for CLI schema validation and complex type resolution.
 *
 * This module provides:
 * - **SchemaIntrospector**: Analyzes Zod schemas to detect complex types and extract metadata
 * - **ValueResolver**: Resolves CLI values from file paths or inline JSON
 * - **SchemaValidator**: Validates resolved values against Zod schemas
 * - **ValidationPipeline**: Orchestrates the complete validation flow
 *
 * @example Basic usage
 * ```typescript
 * import { ValidationPipeline } from '@fathym/cli/validation';
 * import { z } from 'zod';
 *
 * const pipeline = new ValidationPipeline();
 *
 * const result = await pipeline.execute(
 *   ['deploy'],
 *   { config: './config.json' },
 *   params,
 *   {
 *     argsSchema: z.tuple([z.string()]),
 *     flagsSchema: z.object({ config: z.object({ host: z.string() }) }),
 *     log: consoleLog,
 *   }
 * );
 * ```
 *
 * @example Using SchemaIntrospector directly
 * ```typescript
 * import { SchemaIntrospector } from '@fathym/cli/validation';
 *
 * const introspector = new SchemaIntrospector();
 *
 * // Check if a schema should resolve from files
 * introspector.shouldFileCheck(z.object({ })); // true (complex type)
 * introspector.shouldFileCheck(z.string()); // false (primitive)
 * introspector.shouldFileCheck(z.string().meta({ fileCheck: true })); // true (explicit)
 * ```
 *
 * @module
 */

// Types
export type {
  ResolvedParams,
  SchemaFieldMeta,
  ValidateCallback,
  ValidateContext,
  ValidationError,
  ValidationResult,
} from './types.ts';

// Core classes
export { SchemaIntrospector } from './SchemaIntrospector.ts';
export { type ResolveResult, ValueResolver } from './ValueResolver.ts';
export { SchemaValidator } from './SchemaValidator.ts';
export { ValidationPipeline, type ValidationPipelineOptions } from './ValidationPipeline.ts';

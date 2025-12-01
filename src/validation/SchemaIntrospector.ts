// deno-lint-ignore-file no-explicit-any
import type { ZodSchema } from '../.deps.ts';
import type { SchemaFieldMeta } from './types.ts';

/**
 * Complex Zod type names that auto-enable fileCheck.
 * These types typically represent structured data that can be loaded from files.
 */
const COMPLEX_TYPE_NAMES = [
  'ZodObject',
  'ZodArray',
  'ZodRecord',
  'ZodMap',
  'object',
  'array',
  'record',
  'map',
];

/**
 * Wrapper type names that should be unwrapped to find the inner schema.
 */
const WRAPPER_TYPE_NAMES = [
  'ZodOptional',
  'ZodNullable',
  'ZodDefault',
  'ZodCatch',
  'ZodBranded',
  'ZodPipeline',
  'optional',
  'nullable',
  'default',
];

/**
 * Analyzes Zod schemas to determine resolution behavior for CLI flags/args.
 *
 * The SchemaIntrospector examines Zod schemas to:
 * - Detect complex types (objects, arrays) that should auto-enable file resolution
 * - Extract metadata like `fileCheck` from `.meta()` calls
 * - Unwrap wrapper types (optional, nullable) to find the underlying type
 *
 * @example
 * ```typescript
 * const introspector = new SchemaIntrospector();
 *
 * // Check if a schema should resolve from files
 * const configSchema = z.object({ host: z.string() });
 * introspector.shouldFileCheck(configSchema); // true (complex type)
 *
 * // Explicit opt-out
 * const noFileSchema = z.object({}).meta({ fileCheck: false });
 * introspector.shouldFileCheck(noFileSchema); // false
 *
 * // Explicit opt-in for primitive
 * const fileStringSchema = z.string().meta({ fileCheck: true });
 * introspector.shouldFileCheck(fileStringSchema); // true
 * ```
 */
export class SchemaIntrospector {
  /**
   * Determines if a schema represents a complex type that should auto-enable fileCheck.
   * Complex types include: ZodObject, ZodArray, ZodRecord, ZodMap
   *
   * This method unwraps wrapper types (optional, nullable, default) to find the
   * underlying type.
   *
   * @param schema - The Zod schema to analyze
   * @returns true if the schema is a complex type
   */
  isComplexType(schema: ZodSchema): boolean {
    const unwrapped = this.unwrapSchema(schema);
    const typeName = this.getTypeName(unwrapped);
    return COMPLEX_TYPE_NAMES.includes(typeName);
  }

  /**
   * Extracts metadata from a Zod schema.
   *
   * Supports both Zod 3 (`schema._def.meta`) and Zod 4 (`schema.meta()`) patterns.
   *
   * @param schema - The Zod schema to extract metadata from
   * @returns The metadata object, or an empty object if no metadata
   */
  getMeta(schema: ZodSchema): SchemaFieldMeta {
    const schemaAny = schema as any;

    // Zod 4: meta is accessed via .meta() method
    if (typeof schemaAny.meta === 'function') {
      try {
        return schemaAny.meta() ?? {};
      } catch {
        // meta() threw, fall through to _def check
      }
    }

    // Zod 3 and fallback: meta is in _def
    if (schemaAny._def?.meta) {
      return schemaAny._def.meta;
    }

    return {};
  }

  /**
   * Determines if fileCheck is enabled for this schema.
   *
   * Resolution rules:
   * - If `meta.fileCheck` is explicitly set, use that value
   * - If the schema is a complex type (object, array), default to `true`
   * - Otherwise, default to `false`
   *
   * @param schema - The Zod schema to check
   * @returns true if file/JSON resolution should be attempted
   */
  shouldFileCheck(schema: ZodSchema): boolean {
    const meta = this.getMeta(schema);

    // Explicit setting takes precedence
    if (meta.fileCheck !== undefined) {
      return meta.fileCheck;
    }

    // Complex types auto-enable fileCheck
    return this.isComplexType(schema);
  }

  /**
   * Unwraps wrapper types to get the inner schema.
   *
   * Handles: ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodBranded, ZodPipeline
   *
   * @param schema - The Zod schema to unwrap
   * @returns The innermost non-wrapper schema
   */
  unwrapSchema(schema: ZodSchema): ZodSchema {
    const schemaAny = schema as any;
    const typeName = this.getTypeName(schema);

    // Check if this is a wrapper type
    if (WRAPPER_TYPE_NAMES.includes(typeName)) {
      // Different wrapper types store the inner schema in different places
      const innerSchema = schemaAny._def?.innerType ??
        schemaAny._def?.schema ??
        schemaAny._def?.in ??
        schemaAny.unwrap?.();

      if (innerSchema) {
        // Recursively unwrap
        return this.unwrapSchema(innerSchema);
      }
    }

    return schema;
  }

  /**
   * Gets the Zod type name from a schema.
   *
   * @param schema - The Zod schema
   * @returns The type name (e.g., 'ZodObject', 'ZodString')
   */
  getTypeName(schema: ZodSchema): string {
    const schemaAny = schema as any;

    // Zod 4 uses _type
    if (schemaAny._type) {
      return schemaAny._type;
    }

    // Zod 3 uses _def.typeName
    if (schemaAny._def?.typeName) {
      return schemaAny._def.typeName;
    }

    // Fallback to constructor name
    return schemaAny.constructor?.name ?? 'unknown';
  }

  /**
   * Gets the shape of an object schema (the property schemas).
   *
   * @param schema - A ZodObject schema
   * @returns Record of property name to schema, or undefined if not an object
   */
  getObjectShape(schema: ZodSchema): Record<string, ZodSchema> | undefined {
    const unwrapped = this.unwrapSchema(schema);
    const schemaAny = unwrapped as any;

    // Zod 4 and 3 both use .shape
    if (schemaAny.shape && typeof schemaAny.shape === 'object') {
      return schemaAny.shape;
    }

    // Some versions store it in _def
    if (schemaAny._def?.shape && typeof schemaAny._def.shape === 'object') {
      // shape might be a function in some versions
      return typeof schemaAny._def.shape === 'function'
        ? schemaAny._def.shape()
        : schemaAny._def.shape;
    }

    return undefined;
  }

  /**
   * Gets the items of a tuple schema (for args).
   *
   * @param schema - A ZodTuple schema
   * @returns Array of item schemas, or undefined if not a tuple
   */
  getTupleItems(schema: ZodSchema): ZodSchema[] | undefined {
    const schemaAny = schema as any;

    // Zod stores tuple items in _def.items
    if (schemaAny._def?.items && Array.isArray(schemaAny._def.items)) {
      return schemaAny._def.items;
    }

    return undefined;
  }
}

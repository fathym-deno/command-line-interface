// deno-lint-ignore-file no-explicit-any
import type { ZodSchema } from '../.deps.ts';
import type { ValidationError, ValidationResult } from './types.ts';

/**
 * Validates resolved values against Zod schemas.
 *
 * The SchemaValidator wraps Zod's validation API to:
 * - Validate args against a tuple schema
 * - Validate flags against an object schema
 * - Transform Zod errors into our ValidationError format
 * - Support both Zod 3 and Zod 4 APIs
 *
 * @example
 * ```typescript
 * const validator = new SchemaValidator();
 *
 * // Validate flags
 * const flagsResult = validator.validateFlags(
 *   { port: 3000, host: 'localhost' },
 *   z.object({ port: z.number(), host: z.string() })
 * );
 *
 * // Validate args
 * const argsResult = validator.validateArgs(
 *   ['deploy', 'production'],
 *   z.tuple([z.string(), z.string()])
 * );
 * ```
 */
export class SchemaValidator {
  /**
   * Validate flags against a Zod object schema.
   *
   * @param flags - Record of flag name to resolved value
   * @param schema - Zod object schema for flags
   * @returns Validation result with errors or validated data
   */
  validateFlags(
    flags: Record<string, unknown>,
    schema: ZodSchema,
  ): ValidationResult {
    return this.validate(flags, schema, 'flags');
  }

  /**
   * Validate positional arguments against a Zod tuple schema.
   *
   * @param args - Array of resolved argument values
   * @param schema - Zod tuple schema for args
   * @returns Validation result with errors or validated data
   */
  validateArgs(
    args: unknown[],
    schema: ZodSchema,
  ): ValidationResult {
    return this.validate(args, schema, 'args');
  }

  /**
   * Validate both args and flags, returning combined result.
   *
   * @param args - Array of resolved argument values
   * @param flags - Record of flag name to resolved value
   * @param argsSchema - Optional Zod tuple schema for args
   * @param flagsSchema - Optional Zod object schema for flags
   * @returns Combined validation result
   */
  validateAll(
    args: unknown[],
    flags: Record<string, unknown>,
    argsSchema?: ZodSchema,
    flagsSchema?: ZodSchema,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    let validatedArgs = args;
    let validatedFlags = flags;

    // Validate args if schema provided
    if (argsSchema) {
      const argsResult = this.validateArgs(args, argsSchema);
      if (!argsResult.success) {
        errors.push(...(argsResult.errors ?? []));
      } else if (argsResult.data) {
        validatedArgs = argsResult.data.args;
      }
    }

    // Validate flags if schema provided
    if (flagsSchema) {
      const flagsResult = this.validateFlags(flags, flagsSchema);
      if (!flagsResult.success) {
        errors.push(...(flagsResult.errors ?? []));
      } else if (flagsResult.data) {
        validatedFlags = flagsResult.data.flags;
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: { args: validatedArgs, flags: validatedFlags },
    };
  }

  /**
   * Core validation logic using Zod's safeParse.
   *
   * @param value - The value to validate
   * @param schema - The Zod schema to validate against
   * @param prefix - Path prefix for error messages ('args' or 'flags')
   * @returns Validation result
   */
  protected validate(
    value: unknown,
    schema: ZodSchema,
    prefix: 'args' | 'flags',
  ): ValidationResult {
    const schemaAny = schema as any;

    // Use safeParse for non-throwing validation
    let result: { success: boolean; data?: any; error?: any };

    if (typeof schemaAny.safeParse === 'function') {
      result = schemaAny.safeParse(value);
    } else if (typeof schemaAny.parse === 'function') {
      // Fallback for schemas without safeParse
      try {
        const data = schemaAny.parse(value);
        result = { success: true, data };
      } catch (e) {
        result = { success: false, error: e };
      }
    } else {
      // No parse method available, pass through
      return {
        success: true,
        data: prefix === 'args'
          ? { args: value as unknown[], flags: {} }
          : { args: [], flags: value as Record<string, unknown> },
      };
    }

    if (result.success) {
      return {
        success: true,
        data: prefix === 'args'
          ? { args: result.data, flags: {} }
          : { args: [], flags: result.data },
      };
    }

    // Transform Zod errors to our format
    const errors = this.transformZodErrors(result.error, prefix);
    return { success: false, errors };
  }

  /**
   * Transform Zod errors into our ValidationError format.
   *
   * Handles both Zod 3 and Zod 4 error formats.
   *
   * @param zodError - The Zod error object
   * @param prefix - Path prefix ('args' or 'flags')
   * @returns Array of ValidationError objects
   */
  protected transformZodErrors(
    zodError: any,
    prefix: 'args' | 'flags',
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Zod errors have an issues array
    if (zodError?.issues && Array.isArray(zodError.issues)) {
      for (const issue of zodError.issues) {
        errors.push({
          path: [prefix, ...issue.path.map(String)],
          message: issue.message,
          code: issue.code,
        });
      }
    } else if (zodError?.errors && Array.isArray(zodError.errors)) {
      // Alternative error format
      for (const err of zodError.errors) {
        errors.push({
          path: [prefix, ...(err.path ?? []).map(String)],
          message: err.message ?? String(err),
          code: err.code,
        });
      }
    } else if (zodError?.message) {
      // Single error message
      errors.push({
        path: [prefix],
        message: zodError.message,
      });
    } else {
      // Unknown error format
      errors.push({
        path: [prefix],
        message: String(zodError),
      });
    }

    return errors;
  }

  /**
   * Format validation errors for CLI display.
   *
   * Creates human-readable error messages suitable for terminal output.
   *
   * @param errors - Array of validation errors
   * @returns Formatted error string
   */
  formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return '';
    }

    const lines = errors.map((err) => {
      const pathStr = err.path?.length ? err.path.join('.') : 'value';
      return `  • ${pathStr}: ${err.message}`;
    });

    return `Validation errors:\n${lines.join('\n')}`;
  }
}

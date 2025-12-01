import type { CommandParams } from "../commands/CommandParams.ts";
import type { CommandLog } from "../commands/CommandLog.ts";

/**
 * Represents a validation error with path, message, and optional code.
 */
export interface ValidationError {
  /** Path to the field that failed validation (e.g., ['flags', 'config', 'port']) */
  path?: string[];
  /** Human-readable error message */
  message: string;
  /** Machine-readable error code (e.g., 'invalid_type', 'too_small') */
  code?: string;
}

/**
 * Result of a validation operation.
 *
 * @example Success
 * ```typescript
 * { success: true, data: { args: [], flags: { name: 'test' } } }
 * ```
 *
 * @example Failure
 * ```typescript
 * { success: false, errors: [{ path: ['flags', 'name'], message: 'Required' }] }
 * ```
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  success: boolean;
  /** Resolved/validated args and flags (present on success if RootValidate was called) */
  data?: { args: unknown[]; flags: Record<string, unknown> };
  /** Array of validation errors (present on failure) */
  errors?: ValidationError[];
}

/**
 * Context provided to the .Validate() callback.
 *
 * @typeParam A - Args tuple type
 * @typeParam F - Flags record type
 * @typeParam P - CommandParams subclass type
 */
export interface ValidateContext<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
> {
  /** Raw positional arguments */
  Args: A;
  /** Raw flags object */
  Flags: F;
  /** CommandParams instance (with defaults applied) */
  Params: P;
  /** Logger for output */
  Log: CommandLog;
  /**
   * Function to run default schema validation + complex type resolution.
   * Call this to leverage the built-in validation pipeline.
   * You can call it before or after your custom validation, or skip it entirely.
   */
  RootValidate: () => Promise<ValidationResult>;
}

/**
 * Callback type for the .Validate() hook on commands.
 *
 * @typeParam A - Args tuple type
 * @typeParam F - Flags record type
 * @typeParam P - CommandParams subclass type
 *
 * @example Extend default validation
 * ```typescript
 * .Validate(async ({ Params, RootValidate }) => {
 *   const result = await RootValidate();
 *   if (!result.success) return result;
 *
 *   if (Params.Flag('port') < 1024) {
 *     return { success: false, errors: [{ message: 'Privileged port' }] };
 *   }
 *   return { success: true };
 * })
 * ```
 *
 * @example Pre-validation
 * ```typescript
 * .Validate(async ({ Flags, RootValidate }) => {
 *   if (Flags['a'] && Flags['b']) {
 *     return { success: false, errors: [{ message: 'Cannot use both' }] };
 *   }
 *   return await RootValidate();
 * })
 * ```
 *
 * @example Full custom control
 * ```typescript
 * .Validate(async ({ Flags }) => {
 *   // Custom validation, RootValidate not called
 *   return { success: true };
 * })
 * ```
 */
export type ValidateCallback<
  A extends unknown[] = unknown[],
  F extends Record<string, unknown> = Record<string, unknown>,
  P extends CommandParams<A, F> = CommandParams<A, F>,
> = (
  ctx: ValidateContext<A, F, P>,
) => ValidationResult | Promise<ValidationResult>;

/**
 * Metadata extracted from a Zod schema's .meta() call.
 */
export interface SchemaFieldMeta {
  /** If true, attempt to resolve value from file path or JSON string */
  fileCheck?: boolean;
  /** Custom argument name for help display */
  argName?: string;
  /** Custom flag name for help display */
  flagName?: string;
}

/**
 * Internal type for tracking resolution state.
 */
export interface ResolvedParams {
  /** Resolved positional arguments */
  args: unknown[];
  /** Resolved flags */
  flags: Record<string, unknown>;
}

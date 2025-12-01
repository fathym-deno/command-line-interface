// deno-lint-ignore-file no-explicit-any
import type { ZodSchema } from "../.deps.ts";
import type { CommandParams } from "../commands/CommandParams.ts";
import type { CommandLog } from "../commands/CommandLog.ts";
import type {
  ValidateCallback,
  ValidateContext,
  ValidationResult,
} from "./types.ts";
import { SchemaIntrospector } from "./SchemaIntrospector.ts";
import { ValueResolver } from "./ValueResolver.ts";
import { SchemaValidator } from "./SchemaValidator.ts";

/**
 * Options for the validation pipeline.
 */
export interface ValidationPipelineOptions {
  /** Zod schema for positional arguments (tuple) */
  argsSchema?: ZodSchema;
  /** Zod schema for command flags (object) */
  flagsSchema?: ZodSchema;
  /** Custom validation callback from .Validate() */
  validateCallback?: ValidateCallback;
  /** Logger for output */
  log: CommandLog;
}

/**
 * Orchestrates the complete validation pipeline for CLI commands.
 *
 * The ValidationPipeline coordinates the full validation flow:
 * 1. Value Resolution - Load files and parse JSON for complex types
 * 2. Schema Validation - Validate resolved values against Zod schemas
 * 3. Custom Validation - Run user's .Validate() callback if provided
 *
 * The pipeline provides a `RootValidate` function to custom validators,
 * allowing them to:
 * - Call RootValidate() first, then add custom validation
 * - Add custom validation first, then call RootValidate()
 * - Skip RootValidate() entirely for full custom control
 *
 * @example
 * ```typescript
 * const pipeline = new ValidationPipeline();
 *
 * const result = await pipeline.execute(
 *   ['deploy'],           // positional args
 *   { env: 'prod' },      // flags
 *   params,               // CommandParams instance
 *   {
 *     argsSchema: z.tuple([z.string()]),
 *     flagsSchema: z.object({ env: z.string() }),
 *     log: consoleLog,
 *   }
 * );
 *
 * if (!result.success) {
 *   console.error(result.errors);
 * }
 * ```
 */
export class ValidationPipeline {
  protected readonly introspector: SchemaIntrospector;
  protected readonly resolver: ValueResolver;
  protected readonly validator: SchemaValidator;

  constructor(
    introspector?: SchemaIntrospector,
    resolver?: ValueResolver,
    validator?: SchemaValidator,
  ) {
    this.introspector = introspector ?? new SchemaIntrospector();
    this.resolver = resolver ?? new ValueResolver(this.introspector);
    this.validator = validator ?? new SchemaValidator();
  }

  /**
   * Execute the complete validation pipeline.
   *
   * @param args - Raw positional arguments from CLI
   * @param flags - Raw flags from CLI
   * @param params - CommandParams instance (with defaults applied)
   * @param options - Pipeline options including schemas and callback
   * @returns Validation result with resolved data or errors
   */
  async execute(
    args: unknown[],
    flags: Record<string, unknown>,
    params: CommandParams<any, any>,
    options: ValidationPipelineOptions,
  ): Promise<ValidationResult> {
    const { argsSchema, flagsSchema, validateCallback, log } = options;

    // If custom validator is provided, let it control the flow
    if (validateCallback) {
      const ctx = this.buildValidateContext(
        args,
        flags,
        params,
        log,
        argsSchema,
        flagsSchema,
      );

      return await validateCallback(ctx);
    }

    // No custom validator - run default validation
    return await this.runRootValidation(args, flags, argsSchema, flagsSchema);
  }

  /**
   * Build the context object passed to .Validate() callbacks.
   *
   * @param args - Raw positional arguments
   * @param flags - Raw flags
   * @param params - CommandParams instance
   * @param log - Logger
   * @param argsSchema - Optional args schema
   * @param flagsSchema - Optional flags schema
   * @returns ValidateContext with RootValidate function
   */
  protected buildValidateContext(
    args: unknown[],
    flags: Record<string, unknown>,
    params: CommandParams<any, any>,
    log: CommandLog,
    argsSchema?: ZodSchema,
    flagsSchema?: ZodSchema,
  ): ValidateContext {
    // Create RootValidate function that runs the default validation pipeline
    const RootValidate = async (): Promise<ValidationResult> => {
      return await this.runRootValidation(args, flags, argsSchema, flagsSchema);
    };

    return {
      Args: args as any,
      Flags: flags as any,
      Params: params as any,
      Log: log,
      RootValidate,
    };
  }

  /**
   * Run the default validation pipeline (resolution + schema validation).
   *
   * This is what RootValidate() calls, and what runs when no custom
   * validator is provided.
   *
   * @param args - Raw positional arguments
   * @param flags - Raw flags
   * @param argsSchema - Optional args schema
   * @param flagsSchema - Optional flags schema
   * @returns Validation result
   */
  protected async runRootValidation(
    args: unknown[],
    flags: Record<string, unknown>,
    argsSchema?: ZodSchema,
    flagsSchema?: ZodSchema,
  ): Promise<ValidationResult> {
    let resolvedArgs = args;
    let resolvedFlags = flags;
    const resolutionErrors: string[] = [];

    // Phase 1: Value Resolution
    if (argsSchema) {
      const argsResult = await this.resolver.resolveArgs(args, argsSchema);
      resolvedArgs = argsResult.resolved;
      resolutionErrors.push(...argsResult.errors);
    }

    if (flagsSchema) {
      const flagsResult = await this.resolver.resolveFlags(flags, flagsSchema);
      resolvedFlags = flagsResult.resolved;
      resolutionErrors.push(...flagsResult.errors);
    }

    // If resolution had errors, return them
    if (resolutionErrors.length > 0) {
      return {
        success: false,
        errors: resolutionErrors.map((msg) => ({ message: msg })),
      };
    }

    // Phase 2: Schema Validation
    const validationResult = this.validator.validateAll(
      resolvedArgs,
      resolvedFlags,
      argsSchema,
      flagsSchema,
    );

    if (!validationResult.success) {
      return validationResult;
    }

    // Return merged resolved data
    return {
      success: true,
      data: {
        args: validationResult.data?.args ?? resolvedArgs,
        flags: validationResult.data?.flags ?? resolvedFlags,
      },
    };
  }

  /**
   * Get the SchemaIntrospector instance.
   * Useful for external code needing to inspect schemas.
   */
  getIntrospector(): SchemaIntrospector {
    return this.introspector;
  }

  /**
   * Get the ValueResolver instance.
   * Useful for external code needing custom resolution.
   */
  getResolver(): ValueResolver {
    return this.resolver;
  }

  /**
   * Get the SchemaValidator instance.
   * Useful for external code needing custom validation.
   */
  getValidator(): SchemaValidator {
    return this.validator;
  }

  /**
   * Format validation errors for CLI display.
   *
   * @param result - Validation result with errors
   * @returns Formatted error string
   */
  formatErrors(result: ValidationResult): string {
    if (result.success || !result.errors?.length) {
      return "";
    }

    return this.validator.formatErrors(result.errors);
  }
}

import { exists } from '../.deps.ts';
import { SchemaIntrospector } from './SchemaIntrospector.ts';
import type { ZodSchema } from '../.deps.ts';

/**
 * Result of resolving a value from file path or JSON string.
 */
export interface ResolveResult {
  /** Whether resolution succeeded */
  success: boolean;
  /** The resolved value (present on success) */
  value?: unknown;
  /** Error message (present on failure) */
  error?: string;
  /** Whether the value was loaded from a file */
  fromFile?: boolean;
}

/**
 * Resolves CLI flag/arg values from file paths or inline JSON strings.
 *
 * The ValueResolver handles the core resolution logic for complex types:
 * - Detects if a string value looks like a file path
 * - Attempts to load and parse JSON/YAML from files
 * - Falls back to parsing the value as inline JSON
 * - Returns the original value if no resolution is needed
 *
 * @example
 * ```typescript
 * const resolver = new ValueResolver();
 *
 * // Resolve from file path
 * const result1 = await resolver.resolve('./config.json', configSchema);
 * // { success: true, value: { host: 'localhost', port: 3000 }, fromFile: true }
 *
 * // Resolve from inline JSON
 * const result2 = await resolver.resolve('{"host":"localhost"}', configSchema);
 * // { success: true, value: { host: 'localhost' }, fromFile: false }
 *
 * // Primitive value (no resolution needed)
 * const result3 = await resolver.resolve('hello', stringSchema);
 * // { success: true, value: 'hello', fromFile: false }
 * ```
 */
export class ValueResolver {
  protected readonly introspector: SchemaIntrospector;

  constructor(introspector?: SchemaIntrospector) {
    this.introspector = introspector ?? new SchemaIntrospector();
  }

  /**
   * Resolve a value, potentially loading from file or parsing as JSON.
   *
   * Resolution rules:
   * 1. If schema has `fileCheck: false`, return value as-is
   * 2. If schema is complex type OR has `fileCheck: true`:
   *    a. Check if value looks like a file path and file exists → load file
   *    b. Try parsing as JSON string
   *    c. Return original value if neither works
   * 3. Otherwise, return value as-is
   *
   * @param value - The raw string value from CLI
   * @param schema - The Zod schema for this field
   * @returns Resolution result with success status and resolved value
   */
  async resolve(value: unknown, schema: ZodSchema): Promise<ResolveResult> {
    // Non-string values pass through unchanged
    if (typeof value !== 'string') {
      return { success: true, value, fromFile: false };
    }

    // Check if fileCheck is enabled for this schema
    const shouldCheck = this.introspector.shouldFileCheck(schema);

    if (!shouldCheck) {
      return { success: true, value, fromFile: false };
    }

    // Try file path resolution first
    if (this.looksLikeFilePath(value)) {
      const fileResult = await this.resolveFromFile(value);
      if (fileResult.success) {
        return fileResult;
      }
      // File doesn't exist or failed to parse, try JSON parsing
    }

    // Try parsing as inline JSON
    const jsonResult = this.parseAsJson(value);
    if (jsonResult.success) {
      return jsonResult;
    }

    // Return original value - schema validation will catch type mismatches
    return { success: true, value, fromFile: false };
  }

  /**
   * Resolve all flags in a record, applying resolution to each field.
   *
   * @param flags - Record of flag name to raw value
   * @param flagsSchema - Zod object schema for flags
   * @returns Record of flag name to resolved value, plus any errors
   */
  async resolveFlags(
    flags: Record<string, unknown>,
    flagsSchema: ZodSchema,
  ): Promise<{ resolved: Record<string, unknown>; errors: string[] }> {
    const resolved: Record<string, unknown> = { ...flags };
    const errors: string[] = [];

    const shape = this.introspector.getObjectShape(flagsSchema);
    if (!shape) {
      return { resolved, errors };
    }

    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key in flags && flags[key] !== undefined) {
        const result = await this.resolve(flags[key], fieldSchema);
        if (result.success) {
          resolved[key] = result.value;
        } else {
          errors.push(`Flag --${key}: ${result.error}`);
        }
      }
    }

    return { resolved, errors };
  }

  /**
   * Resolve all positional arguments, applying resolution to each.
   *
   * @param args - Array of raw argument values
   * @param argsSchema - Zod tuple schema for args
   * @returns Array of resolved values, plus any errors
   */
  async resolveArgs(
    args: unknown[],
    argsSchema: ZodSchema,
  ): Promise<{ resolved: unknown[]; errors: string[] }> {
    const resolved: unknown[] = [...args];
    const errors: string[] = [];

    const items = this.introspector.getTupleItems(argsSchema);
    if (!items) {
      return { resolved, errors };
    }

    for (let i = 0; i < Math.min(args.length, items.length); i++) {
      const result = await this.resolve(args[i], items[i]);
      if (result.success) {
        resolved[i] = result.value;
      } else {
        errors.push(`Argument ${i + 1}: ${result.error}`);
      }
    }

    return { resolved, errors };
  }

  /**
   * Determines if a string value looks like a file path.
   *
   * Heuristics:
   * - Starts with `./ ` or `../` (relative paths)
   * - Starts with `/` (absolute Unix paths)
   * - Contains `:\` or `:/` (Windows absolute paths like `C:\`)
   * - Ends with common data file extensions (.json, .yaml, .yml, .toml)
   *
   * @param value - The string to check
   * @returns true if the value appears to be a file path
   */
  looksLikeFilePath(value: string): boolean {
    // Relative paths
    if (value.startsWith('./') || value.startsWith('../')) {
      return true;
    }

    // Absolute Unix paths
    if (value.startsWith('/')) {
      return true;
    }

    // Windows absolute paths (C:\ or C:/)
    if (/^[a-zA-Z]:[\\/]/.test(value)) {
      return true;
    }

    // Common data file extensions
    if (/\.(json|ya?ml|toml)$/i.test(value)) {
      return true;
    }

    return false;
  }

  /**
   * Attempt to load and parse a file.
   *
   * Supports:
   * - JSON files (.json)
   * - YAML files (.yaml, .yml) - parsed as JSON after basic conversion
   *
   * @param filePath - Path to the file to load
   * @returns Resolution result with parsed content
   */
  protected async resolveFromFile(filePath: string): Promise<ResolveResult> {
    try {
      // Check if file exists
      const fileExists = await exists(filePath);
      if (!fileExists) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      // Read file content
      const content = await Deno.readTextFile(filePath);

      // Parse based on extension
      const ext = filePath.toLowerCase().split('.').pop();

      if (ext === 'json') {
        try {
          const parsed = JSON.parse(content);
          return { success: true, value: parsed, fromFile: true };
        } catch (e) {
          return {
            success: false,
            error: `Invalid JSON in ${filePath}: ${(e as Error).message}`,
          };
        }
      }

      if (ext === 'yaml' || ext === 'yml') {
        // Basic YAML support - for complex YAML, users should use a YAML library
        // This handles simple key: value and arrays
        try {
          // Attempt to parse as JSON first (valid JSON is valid YAML)
          const parsed = JSON.parse(content);
          return { success: true, value: parsed, fromFile: true };
        } catch {
          // Not JSON, return as raw string for now
          // Full YAML support would require a YAML parser dependency
          return {
            success: false,
            error: `YAML parsing not fully supported. Use JSON format or pre-convert YAML to JSON.`,
          };
        }
      }

      // Unknown extension, try JSON parse
      try {
        const parsed = JSON.parse(content);
        return { success: true, value: parsed, fromFile: true };
      } catch {
        // Return raw content as string
        return { success: true, value: content.trim(), fromFile: true };
      }
    } catch (e) {
      return {
        success: false,
        error: `Failed to read file ${filePath}: ${(e as Error).message}`,
      };
    }
  }

  /**
   * Attempt to parse a string as JSON.
   *
   * @param value - The string to parse
   * @returns Resolution result with parsed value
   */
  protected parseAsJson(value: string): ResolveResult {
    // Quick check - JSON objects/arrays start with { or [
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { success: false, error: 'Not a JSON structure' };
    }

    try {
      const parsed = JSON.parse(trimmed);
      return { success: true, value: parsed, fromFile: false };
    } catch {
      return { success: false, error: 'Invalid JSON syntax' };
    }
  }
}

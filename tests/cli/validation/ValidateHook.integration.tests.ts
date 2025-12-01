/**
 * Integration tests for the .Validate() hook in the fluent command builder.
 *
 * These tests verify the end-to-end validation flow through the CLI framework,
 * from command module definition through execution.
 */

import { assertEquals } from 'jsr:@std/assert@^1.0.0';
import { describe, it } from 'jsr:@std/testing@^1.0.0/bdd';
import { z } from '../../../src/.deps.ts';
import { Command } from '../../../src/fluent/Command.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';
import type { ValidationResult } from '../../../src/validation/types.ts';
import type { CommandLog } from '../../../src/commands/CommandLog.ts';

// Concrete params class for tests (since CommandParams is abstract)
class TestParams<
  A extends unknown[],
  F extends Record<string, unknown>,
> extends CommandParams<A, F> {}

// Stub logger for tests
const stubLog: CommandLog = {
  Info: () => {},
  Warn: () => {},
  Error: () => {},
  Success: () => {},
};

describe('.Validate() Hook Integration', () => {
  describe('Command builder with .Validate()', () => {
    it('includes Validate in built module', () => {
      class Params extends TestParams<[], { name: string }> {}

      const module = Command('test', 'Test command')
        .Args(z.tuple([]))
        .Flags(z.object({ name: z.string() }))
        .Params(Params)
        .Validate(() => ({ success: true }))
        .Run(() => {})
        .Build();

      assertEquals(typeof module.Validate, 'function');
    });

    it('does not include Validate when not defined', () => {
      class Params extends TestParams<[], { name?: string }> {}

      const module = Command('test', 'Test command')
        .Args(z.tuple([]))
        .Flags(z.object({ name: z.string().optional() }))
        .Params(Params)
        .Run(() => {})
        .Build();

      assertEquals(module.Validate, undefined);
    });

    it('Validate receives correct context shape', async () => {
      class Params extends TestParams<[string], { verbose?: boolean }> {}

      const receivedContext: {
        hasArgs?: boolean;
        hasFlags?: boolean;
        hasParams?: boolean;
        hasLog?: boolean;
        hasRootValidate?: boolean;
      } = {};

      const module = Command('test', 'Test command')
        .Args(z.tuple([z.string()]))
        .Flags(z.object({ verbose: z.boolean().optional() }))
        .Params(Params)
        .Validate((ctx) => {
          receivedContext.hasArgs = Array.isArray(ctx.Args);
          receivedContext.hasFlags = typeof ctx.Flags === 'object';
          receivedContext.hasParams = !!ctx.Params;
          receivedContext.hasLog = !!ctx.Log;
          receivedContext.hasRootValidate = typeof ctx.RootValidate === 'function';
          return { success: true };
        })
        .Run(() => {})
        .Build();

      // Simulate calling Validate with mock context
      if (module.Validate) {
        await module.Validate({
          Args: ['deploy'] as [string],
          Flags: { verbose: true },
          Params: new Params(['deploy'], { verbose: true }),
          Log: stubLog,
          RootValidate: () => Promise.resolve({ success: true }),
        });
      }

      assertEquals(receivedContext.hasArgs, true);
      assertEquals(receivedContext.hasFlags, true);
      assertEquals(receivedContext.hasParams, true);
      assertEquals(receivedContext.hasLog, true);
      assertEquals(receivedContext.hasRootValidate, true);
    });
  });

  describe('Validate callback patterns', () => {
    it('post-validation pattern: RootValidate then custom', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: { port?: number };
        Params: CommandParams<unknown[], { port?: number }>;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        const result = await ctx.RootValidate();
        if (!result.success) return result;

        // Custom validation after schema validation
        if (ctx.Flags.port && ctx.Flags.port < 1024) {
          return {
            success: false,
            errors: [
              {
                path: ['flags', 'port'],
                message: 'Privileged port requires sudo',
              },
            ],
          };
        }
        return { success: true };
      };

      // Test with privileged port
      const lowPortResult = await validateFn({
        Args: [],
        Flags: { port: 80 },
        Params: new TestParams([], { port: 80 }),
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(lowPortResult.success, false);
      assertEquals(
        lowPortResult.errors?.[0].message,
        'Privileged port requires sudo',
      );

      // Test with high port
      const highPortResult = await validateFn({
        Args: [],
        Flags: { port: 8080 },
        Params: new TestParams([], { port: 8080 }),
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(highPortResult.success, true);
    });

    it('pre-validation pattern: custom then RootValidate', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: { input?: string; inputFile?: string };
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        // Pre-validation: mutual exclusion check
        if (ctx.Flags.input && ctx.Flags.inputFile) {
          return {
            success: false,
            errors: [{ message: 'Cannot use both --input and --input-file' }],
          };
        }
        return await ctx.RootValidate();
      };

      // Test with both flags
      const bothResult = await validateFn({
        Args: [],
        Flags: { input: 'data', inputFile: './file.json' },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(bothResult.success, false);
      assertEquals(
        bothResult.errors?.[0].message,
        'Cannot use both --input and --input-file',
      );

      // Test with just one flag
      const oneResult = await validateFn({
        Args: [],
        Flags: { input: 'data' },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(oneResult.success, true);
    });

    it('full custom pattern: skip RootValidate', () => {
      let rootValidateCalled = false;

      const validateFn = (ctx: {
        Args: unknown[];
        Flags: { name?: string };
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): ValidationResult => {
        // Completely custom validation - don't call RootValidate
        if (!ctx.Flags.name || ctx.Flags.name.length < 3) {
          return {
            success: false,
            errors: [
              {
                path: ['flags', 'name'],
                message: 'Name must be at least 3 characters',
              },
            ],
          };
        }
        return { success: true };
      };

      const result = validateFn({
        Args: [],
        Flags: { name: 'ab' },
        Params: {},
        Log: {},
        RootValidate: () => {
          rootValidateCalled = true;
          return Promise.resolve({ success: true });
        },
      });

      assertEquals(result.success, false);
      assertEquals(
        result.errors?.[0].message,
        'Name must be at least 3 characters',
      );
      assertEquals(rootValidateCalled, false); // RootValidate should not be called
    });

    it('cross-field validation', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: { min?: number; max?: number };
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        const result = await ctx.RootValidate();
        if (!result.success) return result;

        // Cross-field validation
        if (ctx.Flags.min !== undefined && ctx.Flags.max !== undefined) {
          if (ctx.Flags.min > ctx.Flags.max) {
            return {
              success: false,
              errors: [{
                path: ['flags'],
                message: 'min cannot be greater than max',
              }],
            };
          }
        }
        return { success: true };
      };

      // Test invalid: min > max
      const invalidResult = await validateFn({
        Args: [],
        Flags: { min: 100, max: 10 },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(invalidResult.success, false);
      assertEquals(
        invalidResult.errors?.[0].message,
        'min cannot be greater than max',
      );

      // Test valid: min < max
      const validResult = await validateFn({
        Args: [],
        Flags: { min: 10, max: 100 },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(validResult.success, true);
    });

    it('propagates RootValidate errors', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: Record<string, unknown>;
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        const result = await ctx.RootValidate();
        if (!result.success) return result;

        // Additional validation would go here
        return { success: true };
      };

      // RootValidate returns error
      const result = await validateFn({
        Args: [],
        Flags: {},
        Params: {},
        Log: {},
        RootValidate: () =>
          Promise.resolve({
            success: false,
            errors: [{
              path: ['flags', 'required'],
              message: 'Required field missing',
            }],
          }),
      });

      assertEquals(result.success, false);
      assertEquals(result.errors?.[0].message, 'Required field missing');
    });
  });

  describe('Validate with complex types', () => {
    it('works with resolved config objects', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: { config?: { host: string; port: number } };
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        const result = await ctx.RootValidate();
        if (!result.success) return result;

        // Validate resolved config
        if (ctx.Flags.config) {
          if (ctx.Flags.config.port < 1 || ctx.Flags.config.port > 65535) {
            return {
              success: false,
              errors: [{
                path: ['flags', 'config', 'port'],
                message: 'Port must be 1-65535',
              }],
            };
          }
        }
        return { success: true };
      };

      // Test with invalid port
      const result = await validateFn({
        Args: [],
        Flags: { config: { host: 'localhost', port: 70000 } },
        Params: {},
        Log: {},
        RootValidate: () =>
          Promise.resolve({
            success: true,
            data: {
              args: [],
              flags: { config: { host: 'localhost', port: 70000 } },
            },
          }),
      });

      assertEquals(result.success, false);
      assertEquals(result.errors?.[0].path, ['flags', 'config', 'port']);
    });

    it('works with resolved arrays', async () => {
      const validateFn = async (ctx: {
        Args: unknown[];
        Flags: { targets?: string[] };
        Params: unknown;
        Log: unknown;
        RootValidate: () => Promise<ValidationResult>;
      }): Promise<ValidationResult> => {
        const result = await ctx.RootValidate();
        if (!result.success) return result;

        // Validate at least one target
        if (!ctx.Flags.targets || ctx.Flags.targets.length === 0) {
          return {
            success: false,
            errors: [{
              path: ['flags', 'targets'],
              message: 'At least one target required',
            }],
          };
        }

        // Validate no duplicates
        const unique = new Set(ctx.Flags.targets);
        if (unique.size !== ctx.Flags.targets.length) {
          return {
            success: false,
            errors: [{
              path: ['flags', 'targets'],
              message: 'Duplicate targets not allowed',
            }],
          };
        }

        return { success: true };
      };

      // Test empty targets
      const emptyResult = await validateFn({
        Args: [],
        Flags: { targets: [] },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(emptyResult.success, false);
      assertEquals(
        emptyResult.errors?.[0].message,
        'At least one target required',
      );

      // Test duplicate targets
      const dupResult = await validateFn({
        Args: [],
        Flags: { targets: ['a', 'b', 'a'] },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(dupResult.success, false);
      assertEquals(
        dupResult.errors?.[0].message,
        'Duplicate targets not allowed',
      );

      // Test valid targets
      const validResult = await validateFn({
        Args: [],
        Flags: { targets: ['a', 'b', 'c'] },
        Params: {},
        Log: {},
        RootValidate: () => Promise.resolve({ success: true }),
      });

      assertEquals(validResult.success, true);
    });
  });
});

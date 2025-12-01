import { assertEquals } from 'jsr:@std/assert@^1.0.0';
import { describe, it } from 'jsr:@std/testing@^1.0.0/bdd';
import { z } from '../../../src/.deps.ts';
import { ValidationPipeline } from '../../../src/validation/ValidationPipeline.ts';
import { CommandParams } from '../../../src/commands/CommandParams.ts';
import type { CommandLog } from '../../../src/commands/CommandLog.ts';

// Stub logger for tests
const stubLog: CommandLog = {
  Info: () => {},
  Warn: () => {},
  Error: () => {},
  Success: () => {},
};

// Minimal params class for tests
class TestParams extends CommandParams<unknown[], Record<string, unknown>> {}

describe('ValidationPipeline', () => {
  const pipeline = new ValidationPipeline();

  describe('execute without custom validator', () => {
    it('validates args and flags successfully', async () => {
      const argsSchema = z.tuple([z.string()]);
      const flagsSchema = z.object({ verbose: z.boolean() });
      const params = new TestParams(['deploy'], { verbose: true });

      const result = await pipeline.execute(
        ['deploy'],
        { verbose: true },
        params,
        { argsSchema, flagsSchema, log: stubLog },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.args, ['deploy']);
      assertEquals(result.data?.flags, { verbose: true });
    });

    it('returns errors for invalid args', async () => {
      const argsSchema = z.tuple([z.number()]);
      const params = new TestParams(['not-a-number'], {});

      const result = await pipeline.execute(
        ['not-a-number'],
        {},
        params,
        { argsSchema, log: stubLog },
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 1);
    });

    it('returns errors for invalid flags', async () => {
      const flagsSchema = z.object({ port: z.number() });
      const params = new TestParams([], { port: 'invalid' });

      const result = await pipeline.execute(
        [],
        { port: 'invalid' },
        params,
        { flagsSchema, log: stubLog },
      );

      assertEquals(result.success, false);
    });

    it('resolves complex types from inline JSON', async () => {
      const flagsSchema = z.object({
        config: z.object({ host: z.string() }),
      });
      const params = new TestParams([], { config: '{"host":"localhost"}' });

      const result = await pipeline.execute(
        [],
        { config: '{"host":"localhost"}' },
        params,
        { flagsSchema, log: stubLog },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.config, { host: 'localhost' });
    });

    it('resolves array types from inline JSON', async () => {
      const flagsSchema = z.object({
        targets: z.array(z.string()),
      });
      const params = new TestParams([], { targets: '["a","b","c"]' });

      const result = await pipeline.execute(
        [],
        { targets: '["a","b","c"]' },
        params,
        { flagsSchema, log: stubLog },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.targets, ['a', 'b', 'c']);
    });

    it('passes through primitive flags unchanged', async () => {
      const flagsSchema = z.object({
        name: z.string(),
        count: z.number(),
      });
      const params = new TestParams([], { name: 'test', count: 5 });

      const result = await pipeline.execute(
        [],
        { name: 'test', count: 5 },
        params,
        { flagsSchema, log: stubLog },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.name, 'test');
      assertEquals(result.data?.flags.count, 5);
    });
  });

  describe('execute with custom validator', () => {
    it('calls custom validator with correct context', async () => {
      const argsSchema = z.tuple([z.string()]);
      const flagsSchema = z.object({ name: z.string() });
      const params = new TestParams(['deploy'], { name: 'test' });

      let receivedCtx: {
        Args?: unknown[];
        Flags?: Record<string, unknown>;
        hasParams?: boolean;
        hasLog?: boolean;
        hasRootValidate?: boolean;
      } = {};

      const result = await pipeline.execute(
        ['deploy'],
        { name: 'test' },
        params,
        {
          argsSchema,
          flagsSchema,
          log: stubLog,
          validateCallback: (ctx) => {
            receivedCtx = {
              Args: ctx.Args,
              Flags: ctx.Flags,
              hasParams: !!ctx.Params,
              hasLog: !!ctx.Log,
              hasRootValidate: typeof ctx.RootValidate === 'function',
            };
            return { success: true };
          },
        },
      );

      assertEquals(result.success, true);
      assertEquals(receivedCtx.Args, ['deploy']);
      assertEquals(receivedCtx.Flags, { name: 'test' });
      assertEquals(receivedCtx.hasParams, true);
      assertEquals(receivedCtx.hasLog, true);
      assertEquals(receivedCtx.hasRootValidate, true);
    });

    it('allows custom validator to call RootValidate', async () => {
      const flagsSchema = z.object({
        config: z.object({ host: z.string() }),
      });
      const params = new TestParams([], { config: '{"host":"localhost"}' });

      const result = await pipeline.execute(
        [],
        { config: '{"host":"localhost"}' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            // Call RootValidate to get resolution + validation
            return await ctx.RootValidate();
          },
        },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.config, { host: 'localhost' });
    });

    it('allows custom validator to add validation after RootValidate', async () => {
      const flagsSchema = z.object({ port: z.number() });
      const params = new TestParams([], { port: 80 });

      const result = await pipeline.execute(
        [],
        { port: 80 },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            const rootResult = await ctx.RootValidate();
            if (!rootResult.success) return rootResult;

            // Custom validation: port must be > 1024
            if ((ctx.Flags.port as number) < 1024) {
              return {
                success: false,
                errors: [{ path: ['flags', 'port'], message: 'Privileged port' }],
              };
            }
            return { success: true };
          },
        },
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.[0].message, 'Privileged port');
    });

    it('allows custom validator to skip RootValidate', async () => {
      const flagsSchema = z.object({ name: z.string() });
      const params = new TestParams([], { name: 'test' });

      const result = await pipeline.execute(
        [],
        { name: 'test' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: () => {
            // Skip RootValidate entirely - custom control
            return { success: true };
          },
        },
      );

      assertEquals(result.success, true);
      // Note: data won't have resolved values since RootValidate wasn't called
    });

    it('allows custom validator to reject before RootValidate', async () => {
      const flagsSchema = z.object({
        a: z.boolean().optional(),
        b: z.boolean().optional(),
      });
      const params = new TestParams([], { a: true, b: true });

      const result = await pipeline.execute(
        [],
        { a: true, b: true },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            // Pre-validation: mutual exclusion
            if (ctx.Flags.a && ctx.Flags.b) {
              return {
                success: false,
                errors: [{ message: 'Cannot use both --a and --b' }],
              };
            }
            return await ctx.RootValidate();
          },
        },
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.[0].message, 'Cannot use both --a and --b');
    });
  });

  describe('RootValidate call tracking', () => {
    it('auto-runs RootValidate when no custom validator provided', async () => {
      // This is implicitly tested by "execute without custom validator" suite
      // but we verify resolution happens (which only RootValidate does)
      const flagsSchema = z.object({
        config: z.object({ host: z.string() }),
      });
      const params = new TestParams([], { config: '{"host":"test"}' });

      const result = await pipeline.execute(
        [],
        { config: '{"host":"test"}' },
        params,
        { flagsSchema, log: stubLog },
      );

      // Resolution only happens in RootValidate - so this proves it ran
      assertEquals(result.success, true);
      assertEquals(result.data?.flags.config, { host: 'test' });
    });

    it('does not auto-run RootValidate when custom validator is provided', async () => {
      const flagsSchema = z.object({
        config: z.object({ host: z.string() }),
      });
      const params = new TestParams([], { config: '{"host":"test"}' });

      const result = await pipeline.execute(
        [],
        { config: '{"host":"test"}' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: () => {
            // Don't call RootValidate - just return success
            return { success: true };
          },
        },
      );

      // Since RootValidate wasn't called, data should be undefined
      assertEquals(result.success, true);
      assertEquals(result.data, undefined);
    });

    it('returns resolved data when custom validator calls RootValidate', async () => {
      const flagsSchema = z.object({
        config: z.object({ host: z.string() }),
      });
      const params = new TestParams([], { config: '{"host":"resolved"}' });

      const result = await pipeline.execute(
        [],
        { config: '{"host":"resolved"}' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            // Call RootValidate and return its result
            return await ctx.RootValidate();
          },
        },
      );

      // RootValidate was called, so resolution happened
      assertEquals(result.success, true);
      assertEquals(result.data?.flags.config, { host: 'resolved' });
    });

    it('allows validator to transform data after RootValidate', async () => {
      const flagsSchema = z.object({
        name: z.string(),
      });
      const params = new TestParams([], { name: 'original' });

      const result = await pipeline.execute(
        [],
        { name: 'original' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            const rootResult = await ctx.RootValidate();
            if (!rootResult.success) return rootResult;

            // Return modified data
            return {
              success: true,
              data: {
                args: rootResult.data?.args ?? [],
                flags: {
                  ...rootResult.data?.flags,
                  name: 'transformed',
                },
              },
            };
          },
        },
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.name, 'transformed');
    });

    it('handles RootValidate errors propagated through custom validator', async () => {
      const flagsSchema = z.object({
        port: z.number(),
      });
      const params = new TestParams([], { port: 'not-a-number' });

      const result = await pipeline.execute(
        [],
        { port: 'not-a-number' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            // Call RootValidate - it will fail due to type mismatch
            return await ctx.RootValidate();
          },
        },
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 1);
    });

    it('custom validator can call RootValidate multiple times safely', async () => {
      const flagsSchema = z.object({
        name: z.string(),
      });
      const params = new TestParams([], { name: 'test' });
      let callCount = 0;

      const result = await pipeline.execute(
        [],
        { name: 'test' },
        params,
        {
          flagsSchema,
          log: stubLog,
          validateCallback: async (ctx) => {
            callCount++;
            const result1 = await ctx.RootValidate();
            callCount++;
            const result2 = await ctx.RootValidate();

            // Both calls should succeed
            assertEquals(result1.success, true);
            assertEquals(result2.success, true);

            return result2;
          },
        },
      );

      assertEquals(result.success, true);
      assertEquals(callCount, 2);
    });
  });

  describe('formatErrors', () => {
    it('formats validation result errors', () => {
      const formatted = pipeline.formatErrors({
        success: false,
        errors: [
          { path: ['flags', 'name'], message: 'Required' },
        ],
      });

      assertEquals(formatted.includes('flags.name'), true);
      assertEquals(formatted.includes('Required'), true);
    });

    it('returns empty string for success', () => {
      const formatted = pipeline.formatErrors({ success: true });

      assertEquals(formatted, '');
    });
  });

  describe('getters', () => {
    it('returns introspector instance', () => {
      const introspector = pipeline.getIntrospector();
      assertEquals(typeof introspector.isComplexType, 'function');
    });

    it('returns resolver instance', () => {
      const resolver = pipeline.getResolver();
      assertEquals(typeof resolver.resolve, 'function');
    });

    it('returns validator instance', () => {
      const validator = pipeline.getValidator();
      assertEquals(typeof validator.validateFlags, 'function');
    });
  });
});

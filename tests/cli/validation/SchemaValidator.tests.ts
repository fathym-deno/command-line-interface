import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.0';
import { describe, it } from 'jsr:@std/testing@^1.0.0/bdd';
import { z } from '../../../src/.deps.ts';
import { SchemaValidator } from '../../../src/validation/SchemaValidator.ts';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  describe('validateFlags', () => {
    it('validates valid flags successfully', () => {
      const schema = z.object({
        name: z.string(),
        port: z.number(),
      });

      const result = validator.validateFlags({ name: 'test', port: 3000 }, schema);

      assertEquals(result.success, true);
      assertEquals(result.data?.flags, { name: 'test', port: 3000 });
    });

    it('returns errors for invalid flag types', () => {
      const schema = z.object({
        port: z.number(),
      });

      const result = validator.validateFlags({ port: 'not-a-number' }, schema);

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 1);
      assertEquals(result.errors?.[0].path?.[0], 'flags');
    });

    it('returns errors for missing required flags', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = validator.validateFlags({}, schema);

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 1);
    });

    it('validates optional flags correctly', () => {
      const schema = z.object({
        name: z.string(),
        verbose: z.boolean().optional(),
      });

      const result = validator.validateFlags({ name: 'test' }, schema);

      assertEquals(result.success, true);
    });

    it('validates nested object flags', () => {
      const schema = z.object({
        config: z.object({
          host: z.string(),
          port: z.number(),
        }),
      });

      const result = validator.validateFlags(
        { config: { host: 'localhost', port: 3000 } },
        schema,
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.config, { host: 'localhost', port: 3000 });
    });

    it('returns errors for invalid nested object flags', () => {
      const schema = z.object({
        config: z.object({
          host: z.string(),
          port: z.number(),
        }),
      });

      const result = validator.validateFlags(
        { config: { host: 'localhost', port: 'invalid' } },
        schema,
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.[0].path?.includes('config'), true);
    });

    it('validates array flags', () => {
      const schema = z.object({
        targets: z.array(z.string()),
      });

      const result = validator.validateFlags(
        { targets: ['a', 'b', 'c'] },
        schema,
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags.targets, ['a', 'b', 'c']);
    });

    it('returns errors for invalid array items', () => {
      const schema = z.object({
        ports: z.array(z.number()),
      });

      const result = validator.validateFlags(
        { ports: [3000, 'invalid', 8080] },
        schema,
      );

      assertEquals(result.success, false);
    });
  });

  describe('validateArgs', () => {
    it('validates valid args successfully', () => {
      const schema = z.tuple([z.string(), z.number()]);

      const result = validator.validateArgs(['hello', 42], schema);

      assertEquals(result.success, true);
      assertEquals(result.data?.args, ['hello', 42]);
    });

    it('returns errors for invalid arg types', () => {
      const schema = z.tuple([z.string(), z.number()]);

      const result = validator.validateArgs(['hello', 'not-a-number'], schema);

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 1);
      assertEquals(result.errors?.[0].path?.[0], 'args');
    });

    it('validates single arg tuple', () => {
      const schema = z.tuple([z.string()]);

      const result = validator.validateArgs(['deploy'], schema);

      assertEquals(result.success, true);
      assertEquals(result.data?.args, ['deploy']);
    });

    it('validates empty tuple', () => {
      const schema = z.tuple([]);

      const result = validator.validateArgs([], schema);

      assertEquals(result.success, true);
    });

    it('validates optional args in tuple', () => {
      const schema = z.tuple([z.string(), z.number().optional()]);

      const result = validator.validateArgs(['hello'], schema);

      // Zod will handle the missing optional
      assertEquals(result.success, true);
    });
  });

  describe('validateAll', () => {
    it('validates both args and flags', () => {
      const argsSchema = z.tuple([z.string()]);
      const flagsSchema = z.object({ verbose: z.boolean() });

      const result = validator.validateAll(
        ['deploy'],
        { verbose: true },
        argsSchema,
        flagsSchema,
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.args, ['deploy']);
      assertEquals(result.data?.flags, { verbose: true });
    });

    it('returns combined errors from both args and flags', () => {
      const argsSchema = z.tuple([z.number()]);
      const flagsSchema = z.object({ port: z.number() });

      const result = validator.validateAll(
        ['not-a-number'],
        { port: 'also-not-a-number' },
        argsSchema,
        flagsSchema,
      );

      assertEquals(result.success, false);
      assertEquals(result.errors?.length, 2);
    });

    it('works without args schema', () => {
      const flagsSchema = z.object({ name: z.string() });

      const result = validator.validateAll(
        ['ignored'],
        { name: 'test' },
        undefined,
        flagsSchema,
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.flags, { name: 'test' });
    });

    it('works without flags schema', () => {
      const argsSchema = z.tuple([z.string()]);

      const result = validator.validateAll(
        ['deploy'],
        { ignored: true },
        argsSchema,
        undefined,
      );

      assertEquals(result.success, true);
      assertEquals(result.data?.args, ['deploy']);
    });

    it('works with neither schema', () => {
      const result = validator.validateAll(
        ['anything'],
        { anything: true },
        undefined,
        undefined,
      );

      assertEquals(result.success, true);
    });
  });

  describe('formatErrors', () => {
    it('formats single error', () => {
      const formatted = validator.formatErrors([
        { path: ['flags', 'name'], message: 'Required', code: 'invalid_type' },
      ]);

      assertStringIncludes(formatted, 'flags.name');
      assertStringIncludes(formatted, 'Required');
    });

    it('formats multiple errors', () => {
      const formatted = validator.formatErrors([
        { path: ['flags', 'name'], message: 'Required' },
        { path: ['args', '0'], message: 'Invalid type' },
      ]);

      assertStringIncludes(formatted, 'flags.name');
      assertStringIncludes(formatted, 'args.0');
    });

    it('returns empty string for no errors', () => {
      const formatted = validator.formatErrors([]);

      assertEquals(formatted, '');
    });

    it('handles errors without path', () => {
      const formatted = validator.formatErrors([
        { message: 'Something went wrong' },
      ]);

      assertStringIncludes(formatted, 'value');
      assertStringIncludes(formatted, 'Something went wrong');
    });
  });
});

import { assertEquals } from 'jsr:@std/assert@^1.0.0';
import { describe, it } from 'jsr:@std/testing@^1.0.0/bdd';
import { z } from '../../../src/.deps.ts';
import { ValueResolver } from '../../../src/validation/ValueResolver.ts';

describe('ValueResolver', () => {
  const resolver = new ValueResolver();

  describe('looksLikeFilePath', () => {
    it('detects relative paths starting with ./', () => {
      assertEquals(resolver.looksLikeFilePath('./config.json'), true);
    });

    it('detects relative paths starting with ../', () => {
      assertEquals(resolver.looksLikeFilePath('../config.json'), true);
    });

    it('detects absolute Unix paths', () => {
      assertEquals(resolver.looksLikeFilePath('/etc/config.json'), true);
    });

    it('detects Windows absolute paths', () => {
      assertEquals(resolver.looksLikeFilePath('C:\\config.json'), true);
      assertEquals(resolver.looksLikeFilePath('D:/config.json'), true);
    });

    it('detects JSON file extensions', () => {
      assertEquals(resolver.looksLikeFilePath('config.json'), true);
    });

    it('detects YAML file extensions', () => {
      assertEquals(resolver.looksLikeFilePath('config.yaml'), true);
      assertEquals(resolver.looksLikeFilePath('config.yml'), true);
    });

    it('detects TOML file extensions', () => {
      assertEquals(resolver.looksLikeFilePath('config.toml'), true);
    });

    it('returns false for plain strings', () => {
      assertEquals(resolver.looksLikeFilePath('hello world'), false);
    });

    it('returns false for inline JSON', () => {
      assertEquals(resolver.looksLikeFilePath('{"key":"value"}'), false);
    });

    it('returns false for inline JSON arrays', () => {
      assertEquals(resolver.looksLikeFilePath('[1,2,3]'), false);
    });
  });

  describe('resolve - basic behavior', () => {
    it('passes through non-string values unchanged', async () => {
      const result = await resolver.resolve(42, z.number());
      assertEquals(result, { success: true, value: 42, fromFile: false });
    });

    it('passes through boolean values unchanged', async () => {
      const result = await resolver.resolve(true, z.boolean());
      assertEquals(result, { success: true, value: true, fromFile: false });
    });

    it('passes through null values unchanged', async () => {
      const result = await resolver.resolve(null, z.null());
      assertEquals(result, { success: true, value: null, fromFile: false });
    });

    it('passes through undefined values unchanged', async () => {
      const result = await resolver.resolve(undefined, z.undefined());
      assertEquals(result, { success: true, value: undefined, fromFile: false });
    });

    it('passes through string when fileCheck is disabled (primitive type)', async () => {
      const result = await resolver.resolve('./config.json', z.string());
      assertEquals(result, { success: true, value: './config.json', fromFile: false });
    });
  });

  describe('resolve - inline JSON for complex types', () => {
    it('parses inline JSON object', async () => {
      const result = await resolver.resolve(
        '{"host":"localhost"}',
        z.object({ host: z.string() }),
      );
      assertEquals(result, { success: true, value: { host: 'localhost' }, fromFile: false });
    });

    it('parses inline JSON array of strings', async () => {
      const result = await resolver.resolve('["a","b","c"]', z.array(z.string()));
      assertEquals(result, { success: true, value: ['a', 'b', 'c'], fromFile: false });
    });

    it('parses inline JSON array of numbers', async () => {
      const result = await resolver.resolve('[1,2,3]', z.array(z.number()));
      assertEquals(result, { success: true, value: [1, 2, 3], fromFile: false });
    });

    it('parses nested object structures', async () => {
      const schema = z.object({
        server: z.object({
          host: z.string(),
          port: z.number(),
        }),
        features: z.array(z.string()),
      });
      const json = '{"server":{"host":"localhost","port":3000},"features":["a","b"]}';

      const result = await resolver.resolve(json, schema);

      assertEquals(result.success, true);
      assertEquals(result.value, {
        server: { host: 'localhost', port: 3000 },
        features: ['a', 'b'],
      });
    });

    it('parses array of objects', async () => {
      const schema = z.array(z.object({ name: z.string(), value: z.number() }));
      const json = '[{"name":"a","value":1},{"name":"b","value":2}]';

      const result = await resolver.resolve(json, schema);

      assertEquals(result.success, true);
      assertEquals(result.value, [
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);
    });

    it('returns original value when JSON parse fails for complex type', async () => {
      const result = await resolver.resolve('not-json', z.object({}));
      assertEquals(result.success, true);
      assertEquals(result.value, 'not-json');
    });

    it('returns original value for malformed JSON', async () => {
      const result = await resolver.resolve('{"broken', z.object({}));
      assertEquals(result.success, true);
      assertEquals(result.value, '{"broken');
    });
  });

  describe('resolve - fileCheck meta control', () => {
    it('respects fileCheck: false on complex types (no resolution)', async () => {
      const schema = z.object({ key: z.string() }).meta({ fileCheck: false });
      const result = await resolver.resolve('{"key":"value"}', schema);

      // With fileCheck: false, should NOT parse JSON
      assertEquals(result.success, true);
      assertEquals(result.value, '{"key":"value"}');
    });

    it('respects fileCheck: true on primitive types (enables resolution)', async () => {
      // For primitives with fileCheck: true, inline JSON that looks like
      // a structure won't be parsed (it's a string schema), but file paths would be checked
      const schema = z.string().meta({ fileCheck: true });
      const result = await resolver.resolve('plain string', schema);

      assertEquals(result.success, true);
      assertEquals(result.value, 'plain string');
    });

    it('complex types default to fileCheck: true', async () => {
      const schema = z.object({ host: z.string() }); // No explicit meta
      const result = await resolver.resolve('{"host":"localhost"}', schema);

      assertEquals(result.success, true);
      assertEquals(result.value, { host: 'localhost' });
      assertEquals(result.fromFile, false);
    });

    it('arrays default to fileCheck: true', async () => {
      const schema = z.array(z.number()); // No explicit meta
      const result = await resolver.resolve('[1,2,3]', schema);

      assertEquals(result.success, true);
      assertEquals(result.value, [1, 2, 3]);
    });

    it('records default to fileCheck: true', async () => {
      const schema = z.record(z.string(), z.number()); // No explicit meta
      const result = await resolver.resolve('{"a":1,"b":2}', schema);

      assertEquals(result.success, true);
      assertEquals(result.value, { a: 1, b: 2 });
    });

    it('optional complex types inherit fileCheck behavior', async () => {
      const schema = z.object({ key: z.string() }).optional();
      const result = await resolver.resolve('{"key":"value"}', schema);

      assertEquals(result.success, true);
      assertEquals(result.value, { key: 'value' });
    });
  });

  describe('resolve - file path handling (non-existent files)', () => {
    it('falls back to JSON parsing when file does not exist', async () => {
      // File doesn't exist, so it should try JSON parse
      const result = await resolver.resolve(
        './nonexistent.json',
        z.object({ key: z.string() }),
      );

      // Since the file doesn't exist and it's not valid JSON either,
      // it returns the original value
      assertEquals(result.success, true);
      assertEquals(result.value, './nonexistent.json');
    });

    it('tries JSON parse when file path is also valid JSON', async () => {
      // Edge case: value looks like a path but file doesn't exist
      const result = await resolver.resolve(
        'config.json',
        z.object({ name: z.string() }),
      );

      // File doesn't exist, not valid JSON, returns original
      assertEquals(result.success, true);
      assertEquals(result.value, 'config.json');
    });
  });

  describe('resolveFlags - multiple flags', () => {
    it('resolves mixed complex and primitive flags', async () => {
      const schema = z.object({
        config: z.object({ host: z.string() }),
        verbose: z.boolean().optional(),
        name: z.string(),
      });

      const result = await resolver.resolveFlags(
        { config: '{"host":"localhost"}', verbose: true, name: 'test' },
        schema,
      );

      assertEquals(result.resolved.config, { host: 'localhost' });
      assertEquals(result.resolved.verbose, true);
      assertEquals(result.resolved.name, 'test');
      assertEquals(result.errors, []);
    });

    it('resolves array flags', async () => {
      const schema = z.object({
        targets: z.array(z.string()),
        ports: z.array(z.number()),
      });

      const result = await resolver.resolveFlags(
        { targets: '["a","b"]', ports: '[80,443]' },
        schema,
      );

      assertEquals(result.resolved.targets, ['a', 'b']);
      assertEquals(result.resolved.ports, [80, 443]);
      assertEquals(result.errors, []);
    });

    it('preserves undefined flags', async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = await resolver.resolveFlags({ required: 'value' }, schema);

      assertEquals(result.resolved.required, 'value');
      assertEquals(result.resolved.optional, undefined);
    });

    it('handles empty flags object', async () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      const result = await resolver.resolveFlags({}, schema);

      assertEquals(result.resolved, {});
      assertEquals(result.errors, []);
    });

    it('returns errors for failed resolutions', async () => {
      // This test verifies error handling - though in practice,
      // resolution failures (like file not found) are soft failures
      // that return the original value
      const schema = z.object({
        config: z.object({ host: z.string() }),
      });

      const result = await resolver.resolveFlags(
        { config: 'not-json-not-file' },
        schema,
      );

      // Resolution doesn't fail hard - returns original value
      assertEquals(result.resolved.config, 'not-json-not-file');
      assertEquals(result.errors, []);
    });
  });

  describe('resolveArgs - positional arguments', () => {
    it('resolves complex arg in tuple', async () => {
      const schema = z.tuple([
        z.string(),
        z.object({ key: z.string() }),
      ]);

      const result = await resolver.resolveArgs(
        ['command', '{"key":"value"}'],
        schema,
      );

      assertEquals(result.resolved[0], 'command');
      assertEquals(result.resolved[1], { key: 'value' });
      assertEquals(result.errors, []);
    });

    it('resolves array arg in tuple', async () => {
      const schema = z.tuple([
        z.string(),
        z.array(z.number()),
      ]);

      const result = await resolver.resolveArgs(['deploy', '[1,2,3]'], schema);

      assertEquals(result.resolved[0], 'deploy');
      assertEquals(result.resolved[1], [1, 2, 3]);
    });

    it('handles fewer args than schema items', async () => {
      const schema = z.tuple([z.string(), z.string(), z.string()]);

      const result = await resolver.resolveArgs(['only-one'], schema);

      assertEquals(result.resolved, ['only-one']);
      assertEquals(result.errors, []);
    });

    it('handles more args than schema items', async () => {
      const schema = z.tuple([z.string()]);

      const result = await resolver.resolveArgs(['one', 'two', 'three'], schema);

      // Extra args are preserved but not processed
      assertEquals(result.resolved[0], 'one');
      assertEquals(result.resolved.length, 3);
    });

    it('handles empty args', async () => {
      const schema = z.tuple([]);

      const result = await resolver.resolveArgs([], schema);

      assertEquals(result.resolved, []);
      assertEquals(result.errors, []);
    });
  });
});

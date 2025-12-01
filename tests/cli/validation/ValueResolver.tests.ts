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

    it('returns false for plain strings', () => {
      assertEquals(resolver.looksLikeFilePath('hello world'), false);
    });

    it('returns false for inline JSON', () => {
      assertEquals(resolver.looksLikeFilePath('{"key":"value"}'), false);
    });
  });

  describe('resolve', () => {
    it('passes through non-string values unchanged', async () => {
      const result = await resolver.resolve(42, z.number());
      assertEquals(result, { success: true, value: 42, fromFile: false });
    });

    it('passes through string when fileCheck is disabled', async () => {
      const result = await resolver.resolve('./config.json', z.string());
      assertEquals(result, { success: true, value: './config.json', fromFile: false });
    });

    it('parses inline JSON for complex types', async () => {
      const result = await resolver.resolve('{"host":"localhost"}', z.object({ host: z.string() }));
      assertEquals(result, { success: true, value: { host: 'localhost' }, fromFile: false });
    });

    it('parses inline JSON arrays', async () => {
      const result = await resolver.resolve('[1,2,3]', z.array(z.number()));
      assertEquals(result, { success: true, value: [1, 2, 3], fromFile: false });
    });

    it('returns original value when JSON parse fails for complex type', async () => {
      const result = await resolver.resolve('not-json', z.object({}));
      assertEquals(result.success, true);
      assertEquals(result.value, 'not-json');
    });
  });

  describe('resolveFlags', () => {
    it('resolves multiple flags', async () => {
      const schema = z.object({
        config: z.object({ host: z.string() }),
        verbose: z.boolean().optional(),
      });

      const result = await resolver.resolveFlags(
        { config: '{"host":"localhost"}', verbose: true },
        schema,
      );

      assertEquals(result.resolved.config, { host: 'localhost' });
      assertEquals(result.resolved.verbose, true);
      assertEquals(result.errors, []);
    });
  });
});

import { assertEquals, assertThrows } from '../../test.deps.ts';
import { EmbeddedTemplateLocator } from '../../../src/cli/templates/EmbeddedTemplateLocator.ts';

Deno.test('EmbeddedTemplateLocator – normalizes prefixes and lists files', async () => {
  const locator = new EmbeddedTemplateLocator({
    'base/file.txt': 'hi',
    'base/nested/inner.txt': 'in',
  });

  const files = await locator.ListFiles('/tmp/template/base');
  assertEquals(files.sort(), ['./template/base/file.txt', './template/base/nested/inner.txt']);

  const content = await locator.ReadTemplateFile('./template/base/file.txt');
  assertEquals(content, 'hi');
});

Deno.test('EmbeddedTemplateLocator – throws when missing template', () => {
  const locator = new EmbeddedTemplateLocator({});
  assertThrows(() => locator.ReadTemplateFile('./template/missing.txt'));
});

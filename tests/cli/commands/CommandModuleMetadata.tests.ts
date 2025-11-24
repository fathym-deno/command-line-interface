import { assert, assertEquals } from '../../test.deps.ts';
import {
  CommandModuleMetadataSchema,
  isCommandModuleMetadata,
} from '../../../src/cli/commands/CommandModuleMetadata.ts';

Deno.test('CommandModuleMetadata schema and guard', async (t) => {
  await t.step('accepts name-only metadata', () => {
    const result = CommandModuleMetadataSchema.safeParse({ Name: 'Test' });
    assert(result.success);
  });

  await t.step('rejects missing name', () => {
    const result = CommandModuleMetadataSchema.safeParse({ Description: 'x' });
    assert(!result.success);
  });

  await t.step('guard accepts valid and rejects invalid shapes', () => {
    assertEquals(isCommandModuleMetadata({ Name: 'x' }), true);
    assertEquals(isCommandModuleMetadata({ Name: '' }), false);
    assertEquals(isCommandModuleMetadata({ Usage: 'oops' }), false);
  });
});

import { assert, assertEquals } from '../../test.deps.ts';
import {
  CommandModuleMetadataSchema,
  isCommandModuleMetadata,
} from '../../../src/cli/commands/CommandModuleMetadata.ts';

Deno.test('CommandModuleMetadataSchema – accepts name-only metadata', () => {
  const result = CommandModuleMetadataSchema.safeParse({ Name: 'Test' });
  assert(result.success);
});

Deno.test('CommandModuleMetadataSchema – rejects missing name', () => {
  const result = CommandModuleMetadataSchema.safeParse({ Description: 'x' });
  assert(!result.success);
});

Deno.test('isCommandModuleMetadata – guards valid and invalid shapes', () => {
  assertEquals(isCommandModuleMetadata({ Name: 'x' }), true);
  assertEquals(isCommandModuleMetadata({ Name: '' }), false);
  assertEquals(isCommandModuleMetadata({ Usage: 'oops' }), false);
});

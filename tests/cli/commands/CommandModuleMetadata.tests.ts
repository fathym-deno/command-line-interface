import { assert } from '../../test.deps.ts';
import { CommandModuleMetadataSchema } from '../../../src/cli/commands/CommandModuleMetadata.ts';

Deno.test('CommandModuleMetadataSchema – accepts name-only metadata', () => {
  const result = CommandModuleMetadataSchema.safeParse({ Name: 'Test' });
  assert(result.success);
});

Deno.test('CommandModuleMetadataSchema – rejects missing name', () => {
  const result = CommandModuleMetadataSchema.safeParse({ Description: 'x' });
  assert(!result.success);
});

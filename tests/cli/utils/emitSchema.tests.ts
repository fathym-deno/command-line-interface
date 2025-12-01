import { assert } from '../../test.deps.ts';
import { emitSchema } from '../../../src/utils/emitSchema.ts';
import { z } from '../../test.deps.ts';

Deno.test('emitSchema – writes schema to output directory', async () => {
  const tmp = await Deno.makeTempDir();
  const schema = z.object({ name: z.string() });

  await emitSchema(schema, 'Demo', tmp);

  const contents = await Deno.readTextFile(`${tmp}/Demo.schema.json`);
  const parsed = JSON.parse(contents);

  assert(parsed.$schema !== undefined);
});

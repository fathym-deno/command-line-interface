import { assert, assertEquals } from '../tests.deps.ts';
import { sampleFunction } from '../../src/utils/sampleFunction.ts';

Deno.test('sampleFunction Tests', async (t) => {
  await t.step('Success', () => {
    const name = 'Mike';

    const result = sampleFunction(name, {
      Code: 0,
      Message: 'Success',
    });

    assert(result);
    assertEquals(result, `hello ${name}: true`);
  });

  await t.step('Fail', () => {
    const name = 'Mike';

    const result = sampleFunction(name, {
      Code: 1,
      Message: 'Success',
    });

    assert(result);
    assertEquals(result, `hello ${name}: false`);
  });
});

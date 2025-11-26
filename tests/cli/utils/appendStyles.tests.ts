import { appendStyles } from '../../../src/utils/appendStyles.ts';
import { assertEquals } from '../../test.deps.ts';
import { assert } from '../../test.deps.ts';

Deno.test('Append Styles Tests', async (t) => {
  await t.step('Blue background', () => {
    const result = appendStyles('Hello', 'bgBlue');

    console.log(result);

    assert(result);
    assertEquals(result, '\x1b[44mHello\x1b[49m');
  });

  await t.step('Red text', () => {
    const result = appendStyles('Hello', 'red');

    console.log(result);

    assert(result);
    assertEquals(result, '\x1b[31mHello\x1b[39m');
  });

  await t.step('Strikethrough text', () => {
    const result = appendStyles('Hello', 'strikethrough');

    console.log(result);

    assert(result);
    assertEquals(result, '\x1b[9mHello\x1b[29m');
  });

  await t.step('RGB24 text - Fathym Green', () => {
    const result = appendStyles('Hello', 'rgb24:74:145:142');

    console.log(result);

    assert(result);
    assertEquals(result, '\x1b[38;2;74;145;142mHello\x1b[39m');
  });

  await t.step('Background RGB24 text - Fathym Green', () => {
    const result = appendStyles('Hello', 'bgRgb24:74:145:142');

    console.log(result);

    assert(result);
    assertEquals(result, '\x1b[48;2;74;145;142mHello\x1b[49m');
  });
});

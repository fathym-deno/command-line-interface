import { assert, assertEquals } from '../../test.deps.ts';
import { HelpContextSchema, isHelpContext } from '../../../src/cli/help/HelpContext.ts';

Deno.test('HelpContext schema and guard', async (t) => {
  await t.step('accepts minimal (empty) context', () => {
    const parsed = HelpContextSchema.safeParse({});
    assert(parsed.success);
  });

  await t.step('accepts populated intro/sections', () => {
    const parsed = HelpContextSchema.safeParse({
      Header: 'Help',
      Intro: { Name: 'CLI', Version: '1.0.0', Usage: 'cli <cmd>' },
      Sections: [{
        type: 'CommandDetails',
        Name: 'demo',
        Description: 'desc',
      }],
    });
    assert(parsed.success);
  });

  await t.step('rejects invalid sections', () => {
    const parsed = HelpContextSchema.safeParse({ Sections: 'oops' });
    assert(!parsed.success);
  });

  await t.step('guard accepts valid and rejects invalid shapes', () => {
    assertEquals(isHelpContext({}), true);
    assertEquals(isHelpContext({ Sections: 'oops' }), false);
  });
});

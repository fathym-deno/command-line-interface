import { assert, assertEquals } from '../../test.deps.ts';
import { HelpContextSchema, isHelpContext } from '../../../src/help/HelpContext.ts';

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

  await t.step('accepts command/group lists and error sections', () => {
    const parsed = HelpContextSchema.safeParse({
      Sections: [
        {
          type: 'CommandList',
          title: 'Cmds',
          items: [{ Name: 'run', Description: 'Run' }],
        },
        {
          type: 'GroupList',
          title: 'Groups',
          items: [{ Name: 'scaffold', Description: 'Scaffold' }],
        },
        {
          type: 'Error',
          message: 'Unknown',
          suggestion: 'maybe',
        },
      ],
    });
    assert(parsed.success);
  });
});

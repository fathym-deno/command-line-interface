import { assert, assertEquals } from '../../test.deps.ts';
import { CommandParams } from '../../../src/cli/commands/CommandParams.ts';

class SampleParams extends CommandParams<[string, number?], { 'dry-run'?: boolean }> {
  get Name() {
    return this.Arg(0);
  }
  get Count() {
    return this.Arg(1);
  }
}

Deno.test('CommandParams – accessors and DryRun', async (t) => {
  await t.step('returns typed args/flags and DryRun=true when set', () => {
    const params = new SampleParams(['hello', 2], { 'dry-run': true });
    assertEquals(params.Name, 'hello');
    assertEquals(params.Count, 2);
    assertEquals(params.DryRun, true);
  });

  await t.step('handles missing values and DryRun=false by default', () => {
    const empty = new SampleParams([] as unknown as [string, number?], {});
    assertEquals(empty.Name, undefined);
    assertEquals(empty.Count, undefined);
    assertEquals(empty.DryRun, false);
    assert(empty instanceof CommandParams);
  });
});

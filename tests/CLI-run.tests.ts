// tests/common/cli/cli-exec.test.ts

import { assertMatch, captureLogs, createTestCLI, fromFileUrl, stripColor } from './test.deps.ts';

Deno.test('Test CLI – Execution Coverage', async (t) => {
  const configPath = fromFileUrl(import.meta.resolve('./test-cli/.cli.json'));
  const cli = createTestCLI();

  await t.step('Execute: scaffold/cloud/aws', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold/cloud/aws']));
    const text = stripColor(logs);

    assertMatch(text, /running "scaffold\/cloud\/aws"/i);
    assertMatch(text, /completed/i);
  });

  await t.step('Execute: scaffold/cloud/azure', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold/cloud/azure']));
    const text = stripColor(logs);

    assertMatch(text, /running "scaffold\/cloud\/azure"/i);
    assertMatch(text, /completed/i);
  });

  await t.step('Execute: scaffold/connection', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold/connection']));
    const text = stripColor(logs);

    assertMatch(text, /running "scaffold\/connection"/i);
    assertMatch(text, /completed/i);
  });

  await t.step('Execute: dev', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'dev']));
    const text = stripColor(logs);

    assertMatch(text, /running "dev"/i);
    assertMatch(text, /completed/i);
  });
});

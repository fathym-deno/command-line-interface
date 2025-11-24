import { assertMatch, captureLogs, createTestCLI, fromFileUrl, stripColor } from '../test.deps.ts';

const configPath = fromFileUrl(import.meta.resolve('../../test-cli/.cli.json'));
const cli = createTestCLI();

Deno.test('CLI – Help Coverage', async (t) => {
  await t.step('Root Help', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath]));
    const text = stripColor(logs);
    assertMatch(text, /📘 Test CLI CLI v0\.0\.0/);
    assertMatch(text, /Usage:/);
    assertMatch(text, /Available Commands/);
    assertMatch(text, /dev - Development Mode/);
    assertMatch(text, /Available Groups/);
    assertMatch(text, /scaffold - scaffold/);
  });

  await t.step('Group Help: scaffold', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold', '--help']));
    const text = stripColor(logs);
    assertMatch(text, /📘 Group: scaffold/);
    assertMatch(text, /Available Commands/);
    assertMatch(text, /connection - Scaffold Connection/);
    assertMatch(text, /Available Groups/);
    assertMatch(text, /cloud - Scaffold new Open/);
  });

  await t.step('Nested Group Help: scaffold/cloud', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold/cloud', '--help']));
    const text = stripColor(logs);
    assertMatch(text, /📘 Command: Scaffold Cloud/);
    assertMatch(text, /📘 Group: scaffold\/cloud/);
    assertMatch(text, /Available Commands/);
    assertMatch(text, /aws - Scaffold AWS/);
    assertMatch(text, /azure - Scaffold Azure/);
  });

  await t.step('Leaf Command Help: scaffold/cloud/aws', async () => {
    const logs = await captureLogs(() =>
      cli.RunFromArgs([configPath, 'scaffold/cloud/aws', '--help'])
    );
    const text = stripColor(logs);
    assertMatch(text, /📘 Command: Scaffold AWS/);
  });

  await t.step('Leaf Command Help: scaffold/cloud/azure', async () => {
    const logs = await captureLogs(() =>
      cli.RunFromArgs([configPath, 'scaffold/cloud/azure', '--help'])
    );
    const text = stripColor(logs);
    assertMatch(text, /📘 Command: Scaffold Azure/);
  });

  await t.step('Command Help: scaffold/connection', async () => {
    const logs = await captureLogs(() =>
      cli.RunFromArgs([configPath, 'scaffold/connection', '--help'])
    );
    const text = stripColor(logs);
    assertMatch(text, /📘 Command: Scaffold Connection/);
  });

  await t.step('Command Help: dev', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'dev', '--help']));
    const text = stripColor(logs);
    assertMatch(text, /📘 Command: Development Mode/);
    assertMatch(text, /Usage:/);
    assertMatch(text, /Examples:/);
  });

  await t.step('Unknown Command Help: scaffold/clod', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'scaffold/clod']));
    const text = stripColor(logs);
    assertMatch(text, /❌ Unknown command: scaffold\/clod/);
    assertMatch(text, /💡 Did you mean: scaffold\/cloud\?/);
    assertMatch(text, /test <command> \[options\]/);
  });
});

Deno.test('CLI – Execution Coverage', async (t) => {
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

Deno.test('CLI – Hello Variants', async (t) => {
  await t.step('hello (default)', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'hello']));
    const text = stripColor(logs);
    assertMatch(text, /running "hello"/i);
    assertMatch(text, /👋 Hello, hello!/);
    assertMatch(text, /✅.*completed/i);
  });

  await t.step('hello Azi', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'hello', 'Azi']));
    const text = stripColor(logs);
    assertMatch(text, /👋 Hello, Azi!/);
  });

  await t.step('hello Azi --loud', async () => {
    const logs = await captureLogs(() => cli.RunFromArgs([configPath, 'hello', 'Azi', '--loud']));
    const text = stripColor(logs);
    assertMatch(text, /👋 HELLO, AZI!/);
  });

  await t.step('hello Azi --dry-run', async () => {
    const logs = await captureLogs(() =>
      cli.RunFromArgs([configPath, 'hello', 'Azi', '--dry-run'])
    );
    const text = stripColor(logs);
    assertMatch(text, /🛑 Dry run: "Hello, Azi!"/);
  });

  await t.step('hello Azi --loud --dry-run', async () => {
    const logs = await captureLogs(() =>
      cli.RunFromArgs([configPath, 'hello', 'Azi', '--loud', '--dry-run'])
    );
    const text = stripColor(logs);
    assertMatch(text, /🛑 Dry run: "HELLO, AZI!"/);
  });
});

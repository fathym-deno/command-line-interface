import { assertMatch, captureLogs, createTestCLI, fromFileUrl, stripColor } from './test.deps.ts';

Deno.test('Hello Command – Runtime Variants', async (t) => {
  const configPath = fromFileUrl(import.meta.resolve('../test-cli/.cli.json'));
  const cli = createTestCLI();

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

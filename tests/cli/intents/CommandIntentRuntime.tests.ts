// deno-lint-ignore-file no-explicit-any
import { assertRejects } from '../../test.deps.ts';
import { CommandIntentRuntime } from '../../../src/intents/CommandIntentRuntime.ts';
import type { CLIInitFn } from '../../../src/types/CLIInitFn.ts';
import HelloModule from '../../../test-cli/commands/hello.ts';
import initFn from '../../../test-cli/.cli.init.ts';

const telemetryInit: CLIInitFn = (ioc, config) => {
  const logger = {
    debug: (...args: unknown[]) => console.log(...args),
    info: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    fatal: (...args: unknown[]) => console.error(...args),
    withContext: () => logger,
  };

  ioc.Register(() => logger, { Type: ioc.Symbol('TelemetryLogger') });

  return (initFn as CLIInitFn)(ioc, config);
};

Deno.test('CommandIntentRuntime – errors when .cli.json missing', async () => {
  const missingConfig = '/tmp/nowhere/.cli.json';
  const runtime = new CommandIntentRuntime(
    'missing config',
    HelloModule as any,
    [] as any,
    {} as any,
    missingConfig,
    telemetryInit,
  );

  await assertRejects(() => runtime.Run(), Error, '.cli.json');
});

Deno.test(
  'CommandIntentRuntime – fails assertion when exit code expectation not met',
  async () => {
    const configPath = './test-cli/.cli.json';
    const runtime = new CommandIntentRuntime(
      'exit mismatch',
      HelloModule as any,
      [] as any,
      {} as any,
      configPath,
      telemetryInit,
    );

    runtime.ExpectExit(1);

    await assertRejects(() => runtime.Run(), Error, 'Expected exit code 1');
  },
);

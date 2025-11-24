import { CommandIntent, CommandIntents } from '../../test.deps.ts';
import type { CLIInitFn } from '../../../src/cli/types/CLIInitFn.ts';
import initFn from '../../../test-cli/.cli.init.ts';
import HelloModule from '../../../test-cli/commands/hello.ts';

const configPath = './test-cli/.cli.json';

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

CommandIntent('CommandIntent – Hello default greeting', HelloModule as any, configPath)
  .WithInit(telemetryInit as any)
  .ExpectLogs('👋 Hello, world!')
  .Run();

CommandIntents('CommandIntents – Hello variants', HelloModule as any, configPath)
  .WithInit(telemetryInit as any)
  .Intent('named greet', (b) => b.Args(['Azi'] as any).ExpectLogs('👋 Hello, Azi!'))
  .Intent('loud dry run', (b) =>
    b
      .Args(['Azi'] as any)
      .Flags({ loud: true, 'dry-run': true } as any)
      .ExpectLogs('🛑 Dry run: "HELLO, AZI!"'),
  )
  .Run();

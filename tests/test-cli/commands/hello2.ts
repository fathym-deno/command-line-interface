import type { IoCContainer } from '../../../src/cli/.deps.ts';
import type { SayHello } from '../.cli.init.ts';
import { Command } from '../../../src/cli/fluent/Command.ts';
import { HelloArgsSchema, HelloCommandParams, HelloFlagsSchema } from './hello.ts';

export default Command('hello', 'Prints a friendly greeting.')
  .Args(HelloArgsSchema)
  .Flags(HelloFlagsSchema)
  .Params(HelloCommandParams)
  .Services((ioc: IoCContainer) => ({
    SayHello: ioc.Resolve<SayHello>(ioc.Symbol('SayHello')),
  }))
  .Run(async ({ Params, Log, Services }) => {
    const sayHelloSvc = await Services.SayHello;

    let message = sayHelloSvc.Speak(Params.Name);

    if (Params.Loud) {
      message = message.toUpperCase();
    }

    if (Params.DryRun) {
      Log.Info(`🛑 Dry run: "${message}" would have been printed.`);
    } else {
      Log.Info(`👋 ${message}`);
    }
  });

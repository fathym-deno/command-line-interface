import type { IoCContainer } from "../.deps.ts";
import type { SayHello } from "../.cli.init.ts";
import { Command } from "../../src/fluent/Command.ts";
import {
  HelloArgsSchema,
  HelloCommandParams,
  HelloFlagsSchema,
} from "./hello.ts";

export default Command("hello", "Prints a friendly greeting.")
  .Args(HelloArgsSchema)
  .Flags(HelloFlagsSchema)
  .Params(HelloCommandParams)
  .Services(async (_ctx, ioc: IoCContainer) => {
    const sayHello = await ioc.Resolve<SayHello>(ioc.Symbol("SayHello"));

    return { SayHello: sayHello };
  })
  .Run(({ Params, Log, Services }) => {
    const sayHelloSvc = Services.SayHello as SayHello;

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

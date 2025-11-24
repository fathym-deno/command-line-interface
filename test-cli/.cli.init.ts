import type { IoCContainer } from './.deps.ts';
import type { CLIInitFn } from '../../src/cli/types/CLIInitFn.ts';

export interface SayHello {
  Speak(name: string): string;
}

export class DefaultSayHello implements SayHello {
  Speak(name: string): string {
    return `Hello, ${name}!`;
  }
}

export default ((ioc: IoCContainer, _config: unknown) => {
  ioc.Register(() => new DefaultSayHello(), {
    Type: ioc.Symbol('SayHello'),
  });
}) as CLIInitFn;

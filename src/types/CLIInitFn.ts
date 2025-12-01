import type { IoCContainer } from '../.deps.ts';
import type { CLIConfig } from './CLIConfig.ts';

/**
 * Defines the shape of a CLI-wide initialization hook.
 * Called once before command resolution.
 */
export type CLIInitFn = (
  ioc: IoCContainer,
  config: CLIConfig,
) => void | Promise<void>;

import type { CLICommandSource, CLIConfig } from "./CLIConfig.ts";

export type CLIParsedResult = {
  parsed: Record<string, unknown>;
  flags: Record<string, unknown>;
  positional: string[];
  initPath: string | undefined;
  key: string | undefined;
  config: CLIConfig;
  commandSources: CLICommandSource[];
  baseTemplatesDir: string;
};

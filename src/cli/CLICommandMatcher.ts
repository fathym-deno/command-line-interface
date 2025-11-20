import type { CLICommandEntry } from "./types/CLICommandEntry.ts";
import type { CLICommandResolver } from "./CLICommandResolver.ts";
import type { CLIConfig } from "./types/CLIConfig.ts";
import { CLIHelpBuilder } from "./help/CLIHelpBuilder.ts";
import type { CommandMatch } from "./commands/CommandMatch.ts";
import { HelpCommand, HelpCommandParams } from "./help/HelpCommand.ts";

export class CLICommandMatcher {
  constructor(protected resolver: CLICommandResolver) {}

  public async Resolve(
    config: CLIConfig,
    commandMap: Map<string, CLICommandEntry>,
    key: string | undefined,
    flags: Record<string, unknown>,
    positional: string[],
    baseTemplatesDir?: string,
  ): Promise<CommandMatch> {
    let match: CLICommandEntry | undefined;
    let remainingArgs: string[] = [];

    const parts = [...positional];
    while (parts.length > 0) {
      const tryKey = parts.join("/");
      const entry = commandMap.get(tryKey);

      if (entry?.CommandPath || entry?.GroupPath) {
        match = entry;
        key = tryKey;
        remainingArgs = positional.slice(parts.length);
        break;
      }

      parts.pop();
    }

    if (!match && key) {
      const entry = commandMap.get(key);
      if (entry?.CommandPath || entry?.GroupPath) {
        match = entry;
        remainingArgs = positional.slice(1);
      }
    }

    const [cmdDets, groupDets] = match
      ? await Promise.all([
        match.CommandPath ? await this.resolver.LoadCommandInstance(match.CommandPath) : undefined,
        match.GroupPath ? await this.resolver.LoadCommandInstance(match.GroupPath) : undefined,
      ])
      : [undefined, undefined];

    let cmdInst = cmdDets?.Command;
    let paramsCtor = cmdDets?.Params;
    const groupInst = groupDets?.Command;

    const isGroupOnly = !cmdInst && groupInst;
    const isHelpRequested = flags.help === true;
    const shouldShowHelp = isHelpRequested || !key || isGroupOnly ||
      (!cmdInst && !groupInst);

    if (shouldShowHelp || !cmdInst) {
      const helpBuilder = new CLIHelpBuilder(this.resolver);
      const helpCtx = await helpBuilder.Build(
        config,
        commandMap,
        key,
        flags,
        cmdInst,
        groupInst,
      );

      cmdInst = helpCtx ? new HelpCommand() : undefined;

      paramsCtor = class extends HelpCommandParams {
        constructor(_args: unknown[], flags: Record<string, unknown>) {
          super([], { ...flags, ...helpCtx });
        }
      };
    }

    return {
      Command: cmdInst,
      Flags: { ...flags, baseTemplatesDir },
      Args: remainingArgs,
      Params: paramsCtor,
    };
  }
}

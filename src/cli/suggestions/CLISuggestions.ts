import { findClosestMatch } from '../.deps.ts';
import type { CommandRuntime } from '../commands/CommandRuntime.ts';
import type { CommandSuggestions } from '../commands/CommandSuggestions.ts';

export class DefaultCLISuggestions {
  SuggestCommands(partial: string, keys: string[]): string[] {
    const match = findClosestMatch(partial, keys);
    return match ? [match] : [];
  }

  SuggestForCommand(
    _key: string,
    _command: CommandRuntime,
  ): CommandSuggestions {
    // return command.Suggestions?.() ?? {};
    throw new Error();
  }
}

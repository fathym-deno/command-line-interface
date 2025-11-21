import { findClosestMatch } from '../.deps.ts';
import type { CLICommandEntry } from '../types/CLICommandEntry.ts';
import type { CLICommandResolver } from '../CLICommandResolver.ts';
import type { CLIConfig } from '../types/CLIConfig.ts';
import type { CommandRuntime } from '../commands/CommandRuntime.ts';
import type { CommandModuleMetadata } from '../commands/CommandModuleMetadata.ts';
import type { HelpContext } from './HelpContext.ts';

export class CLIHelpBuilder {
  constructor(protected resolver: CLICommandResolver) {}

  public async Build(
    config: CLIConfig,
    commandMap: Map<string, CLICommandEntry>,
    key: string | undefined,
    _flags: Record<string, unknown>,
    cmdInst?: CommandRuntime,
    groupInst?: CommandRuntime,
  ): Promise<HelpContext | undefined> {
    const sections: HelpContext['Sections'] = [];

    const formatItem = (
      item: CommandModuleMetadata & { Token: string },
      baseKey: string,
    ): CommandModuleMetadata => {
      const tokenParts = item.Token.split('/');
      const baseParts = baseKey ? baseKey.split('/') : [];
      const trimmed = tokenParts.slice(baseParts.length).join(' ');

      return {
        ...item,
        Name: `${trimmed} - ${item.Name}`,
        Description: item.Description,
      };
    };

    const getChildItems = async (
      key: string,
      groupsOnly: boolean,
    ): Promise<(CommandModuleMetadata & { Token: string })[]> => {
      const baseDepth = key === '' ? 0 : key.split('/').length;
      const matches = [...commandMap.entries()].filter(([k, v]) => {
        const depth = k.split('/').length;
        const isDirectChild = (key === '' && depth === 1) ||
          (k.startsWith(`${key}/`) && depth === baseDepth + 1);
        const isTypeMatch = groupsOnly ? !!v.GroupPath : !!v.CommandPath;
        return isDirectChild && isTypeMatch;
      });

      const results: (CommandModuleMetadata & { Token: string })[] = [];
      for (const [commandKey, entry] of matches) {
        const path = groupsOnly ? entry.GroupPath : entry.CommandPath;
        if (!path) continue;

        try {
          const inst = await this.resolver.LoadCommandInstance(path);
          const meta = inst?.Command.BuildMetadata?.();
          if (meta?.Name) results.push({ ...meta, Token: commandKey });
        } catch {
          console.warn(`⚠️ Skipped metadata load from ${path}`);
        }
      }

      return results;
    };

    const buildRootIntro = async (): Promise<CommandModuleMetadata> => {
      const token = config.Tokens?.[0] ??
        config.Name.toLowerCase().replace(/\s+/g, '-');
      const rootCmds = await getChildItems('', false);
      const examples = rootCmds
        .slice(0, 2)
        .map((cmd) => `${token} ${cmd.Token.replace(/\//g, ' ')}`);
      return {
        Name: `${config.Name} CLI v${config.Version}`,
        Description: config.Description,
        Usage: `${token} <command> [options]`,
        Examples: examples.length ? examples : [`${token} --help`],
      };
    };

    if (key) {
      if (groupInst) {
        const grpMd = groupInst.BuildMetadata();
        sections.push({
          type: 'GroupDetails',
          ...grpMd,
          Name: `Group: ${grpMd.Name}`,
        });
      }

      if (cmdInst) {
        const cmdMd = cmdInst.BuildMetadata();
        sections.push({
          type: 'CommandDetails',
          ...cmdMd,
          Name: `Command: ${cmdMd.Name}`,
        });
      }

      if (groupInst) {
        const cmds = await getChildItems(key, false);
        if (cmds.length) {
          sections.push({
            type: 'CommandList',
            title: 'Available Commands',
            items: cmds.map((item) => formatItem(item, key)),
          });
        }

        const grps = await getChildItems(key, true);
        if (grps.length) {
          sections.push({
            type: 'GroupList',
            title: 'Available Groups',
            items: grps.map((item) => formatItem(item, key)),
          });
        }
      }

      if (!cmdInst && !groupInst) {
        const guess = findClosestMatch(key, [...commandMap.keys()]);
        sections.push({
          type: 'Error',
          message: `Unknown command: ${key}`,
          suggestion: guess,
          Name: key,
        });

        const root = await buildRootIntro();
        if (root) {
          sections.unshift({ type: 'CommandDetails', ...root });
        }
      }
    } else {
      const root = await buildRootIntro();
      if (root) {
        sections.push({ type: 'CommandDetails', ...root });
      }

      const rootCmds = await getChildItems('', false);
      if (rootCmds.length) {
        sections.push({
          type: 'CommandList',
          title: 'Available Commands',
          items: rootCmds.map((item) => formatItem(item, '')),
        });
      }

      const rootGrps = await getChildItems('', true);
      if (rootGrps.length) {
        sections.push({
          type: 'GroupList',
          title: 'Available Groups',
          items: rootGrps.map((item) => formatItem(item, '')),
        });
      }
    }

    return sections.length ? { Sections: sections } : undefined;
  }
}

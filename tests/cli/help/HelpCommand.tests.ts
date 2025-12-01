import { assertMatch } from '../../test.deps.ts';
import { captureLogs } from '../../../src/.exports.ts';
import { HelpCommand, HelpCommandParams } from '../../../src/help/HelpCommand.ts';
import type { CommandContext } from '../../../src/commands/CommandContext.ts';
import type { HelpContext } from '../../../src/help/HelpContext.ts';

// Helper to create a minimal CommandContext for HelpCommand
function createHelpContext(
  helpContext: HelpContext,
): CommandContext<HelpCommandParams> {
  const params = new HelpCommandParams([], helpContext);
  return {
    Key: 'help',
    Params: params,
    Log: {
      Info: console.log,
      Warn: console.warn,
      Error: console.error,
      Debug: console.debug,
    },
    Services: {},
  } as unknown as CommandContext<HelpCommandParams>;
}

// Helper to wrap sync function for captureLogs which expects async
function wrapSync(fn: () => void): () => Promise<void> {
  return () => {
    fn();
    return Promise.resolve();
  };
}

Deno.test('HelpCommand – renders command details', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders command name and description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: hello',
          Description: 'Prints a greeting message',
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /📘 Command: hello/);
    assertMatch(output, /Prints a greeting message/);
  });

  await t.step('renders usage section', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: greet',
          Usage: '<name> [--loud]',
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Usage:/);
    assertMatch(output, /<name> \[--loud\]/);
  });

  await t.step('renders examples section', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: deploy',
          Examples: ['deploy --target prod', 'deploy --dry-run'],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Examples:/);
    assertMatch(output, /deploy --target prod/);
    assertMatch(output, /deploy --dry-run/);
  });
});

Deno.test('HelpCommand – renders args with descriptions', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders arg name and description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: greet',
          Args: [
            { Name: 'name', Description: 'The name to greet', Optional: false },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Args:/);
    assertMatch(output, /<name> - The name to greet/);
  });

  await t.step('renders multiple args', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: copy',
          Args: [
            {
              Name: 'source',
              Description: 'Source file path',
              Optional: false,
            },
            { Name: 'dest', Description: 'Destination path', Optional: true },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /<source> - Source file path/);
    assertMatch(output, /<dest> - Destination path/);
  });

  await t.step('renders arg without description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: run',
          Args: [
            { Name: 'script', Optional: false },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Args:/);
    assertMatch(output, /<script>/);
    // Should not have a trailing " - " when no description
    if (output.includes('<script> -')) {
      throw new Error('Should not render " - " when no description');
    }
  });
});

Deno.test('HelpCommand – renders flags with descriptions', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders flag name and description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: build',
          Flags: [
            {
              Name: 'verbose',
              Description: 'Enable verbose output',
              Optional: true,
            },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Flags:/);
    assertMatch(output, /--verbose - Enable verbose output/);
  });

  await t.step('renders multiple flags', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: deploy',
          Flags: [
            { Name: 'force', Description: 'Skip confirmation', Optional: true },
            {
              Name: 'dry-run',
              Description: 'Show what would happen',
              Optional: true,
            },
            {
              Name: 'target',
              Description: 'Deploy target environment',
              Optional: true,
            },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /--force - Skip confirmation/);
    assertMatch(output, /--dry-run - Show what would happen/);
    assertMatch(output, /--target - Deploy target environment/);
  });

  await t.step('renders flag without description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandDetails',
          Name: 'Command: test',
          Flags: [
            { Name: 'watch', Optional: true },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /Flags:/);
    assertMatch(output, /--watch/);
  });
});

Deno.test('HelpCommand – renders group details', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders group name and description', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'GroupDetails',
          Name: 'Group: scaffold',
          Description: 'Generate project scaffolding',
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /📘 Group: scaffold/);
    assertMatch(output, /Generate project scaffolding/);
  });
});

Deno.test('HelpCommand – renders command and group lists', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders command list', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'CommandList',
          title: 'Available Commands',
          items: [
            { Name: 'build', Description: 'Build the project' },
            { Name: 'test', Description: 'Run tests' },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /🔸 Available Commands/);
    assertMatch(output, /build - Build the project/);
    assertMatch(output, /test - Run tests/);
  });

  await t.step('renders group list', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'GroupList',
          title: 'Available Groups',
          items: [
            { Name: 'scaffold', Description: 'Scaffolding commands' },
            { Name: 'config', Description: 'Configuration commands' },
          ],
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /🔸 Available Groups/);
    assertMatch(output, /scaffold - Scaffolding commands/);
    assertMatch(output, /config - Configuration commands/);
  });
});

Deno.test('HelpCommand – renders error section', async (t) => {
  const cmd = new HelpCommand();

  await t.step('renders error message', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'Error',
          message: 'Unknown command: foobar',
          Name: 'foobar',
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /❌ Unknown command: foobar/);
  });

  await t.step('renders error with suggestion', async () => {
    const ctx = createHelpContext({
      Sections: [
        {
          type: 'Error',
          message: 'Unknown command: buld',
          suggestion: 'build',
          Name: 'buld',
        },
      ],
    });

    const output = await captureLogs(wrapSync(() => cmd.Run(ctx)));
    assertMatch(output, /❌ Unknown command: buld/);
    assertMatch(output, /💡 Did you mean: build\?/);
  });
});

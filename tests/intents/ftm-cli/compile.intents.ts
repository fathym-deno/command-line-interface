import { CommandIntents } from '../../test.deps.ts';
import CompileCommand from '../../../src/cli/ftm-cli/commands/compile.ts';

CommandIntents(
  'Compile Command Suite',
  CompileCommand.Build(),
  import.meta.resolve('../../../src/cli/ftm-cli/.cli.json'),
)
  .Intent('Compile CLI binary from build output', (int) =>
    int
      .Args([])
      .Flags({
        entry: './test/my-cli/.build/cli.ts',
      })
      .ExpectLogs(
        '🔧 Compiling CLI for:',
        '- Entry: C:\\Fathym\\source\\github\\fathym-deno\\reference-architecture\\test\\my-cli\\.build\\cli.ts',
        '- Output dir: C:\\Fathym\\source\\github\\fathym-deno\\reference-architecture\\test\\my-cli\\.dist',
        '✅ Compiled:',
        '👉 To install, run: `your-cli install --from',
      )
      .ExpectExit(0))
  .Run();

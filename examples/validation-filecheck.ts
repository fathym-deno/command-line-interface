/**
 * fileCheck Meta Control Example
 *
 * Demonstrates explicit control over file resolution:
 * - Complex types auto opt-in (fileCheck: true by default)
 * - Disable with .meta({ fileCheck: false }) to require inline JSON only
 * - Primitives opt-in with .meta({ fileCheck: true }) to load file contents
 *
 * Usage:
 *   # template loads file contents as string (fileCheck: true on primitive)
 *   mycli render --template ./email.html --data '{"name":"Alice"}'
 *
 *   # data accepts file or inline JSON (complex type, fileCheck: true by default)
 *   mycli render --template ./email.html --data ./user.json
 *
 *   # inlineOnly MUST be inline JSON (fileCheck: false override)
 *   mycli render --template ./email.html --data '{}' --inline-only '{"key":"value"}'
 */

import { Command, CommandParams } from '../src/.exports.ts';
import { z } from '../src/.deps.ts';

const FlagsSchema = z.object({
  // Primitive with fileCheck: true - loads file contents as string
  template: z.string()
    .meta({ fileCheck: true })
    .describe('Template file to render'),

  // Complex type - auto fileCheck: true (default behavior)
  data: z.record(z.string(), z.unknown())
    .describe('Data to inject into template'),

  // Complex type with fileCheck: false - MUST be inline JSON
  'inline-only': z.object({ key: z.string() })
    .meta({ fileCheck: false })
    .optional()
    .describe('Must be inline JSON, not a file path'),

  // Regular primitive - fileCheck: false by default
  output: z.string()
    .optional()
    .describe('Output file path (literal string, not loaded)'),

  'dry-run': z.boolean().optional(),
});

class RenderParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get Template() {
    return this.Flag('template')!;
  }
  get Data() {
    return this.Flag('data')!;
  }
  get InlineOnly() {
    return this.Flag('inline-only');
  }
  get Output() {
    return this.Flag('output') ?? 'output.html';
  }
}

export default Command('render', 'Render template with data')
  .Args(z.tuple([]))
  .Flags(FlagsSchema)
  .Params(RenderParams)
  .Run(async ({ Params, Log }) => {
    Log.Info('Template content loaded:');
    Log.Info(`  Length: ${Params.Template.length} chars`);
    Log.Info(`  Preview: ${Params.Template.slice(0, 50)}...`);

    Log.Info('Data keys:');
    for (const key of Object.keys(Params.Data)) {
      Log.Info(`  - ${key}`);
    }

    if (Params.InlineOnly) {
      Log.Info(`Inline-only key: ${Params.InlineOnly.key}`);
    }

    Log.Info(`Output file: ${Params.Output}`);
  })
  .Build();

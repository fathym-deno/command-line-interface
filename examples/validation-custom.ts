/**
 * Custom Validation Hook Example
 *
 * Demonstrates the .Validate() hook patterns:
 * - Post-validation: Call RootValidate() then add business logic
 * - Pre-validation: Check conditions before RootValidate()
 * - Full custom: Skip RootValidate() entirely
 *
 * Usage:
 *   mycli transfer --from savings --to checking --amount 100
 *   mycli transfer --from savings --to savings --amount 100  # Error: same account
 *   mycli transfer --from checking --to savings --amount 1000000  # Error: exceeds limit
 */

import { Command, CommandParams } from '../src/.exports.ts';
import { z } from '../src/.deps.ts';

const FlagsSchema = z.object({
  from: z.string().describe('Source account'),
  to: z.string().describe('Destination account'),
  amount: z.number().describe('Transfer amount'),
  force: z.boolean().optional().describe('Skip safety limits'),
  'dry-run': z.boolean().optional(),
});

class TransferParams extends CommandParams<[], z.infer<typeof FlagsSchema>> {
  get From() {
    return this.Flag('from')!;
  }
  get To() {
    return this.Flag('to')!;
  }
  get Amount() {
    return this.Flag('amount')!;
  }
  get Force() {
    return this.Flag('force') ?? false;
  }
}

export default Command('transfer', 'Transfer between accounts')
  .Args(z.tuple([]))
  .Flags(FlagsSchema)
  .Params(TransferParams)
  .Validate(async ({ Params, Log, RootValidate }) => {
    // Pattern 1: Run schema validation first
    const result = await RootValidate();
    if (!result.success) return result;

    // Pattern 2: Add business logic validation AFTER schema validation
    // At this point we know types are correct

    // Cross-field validation: accounts must be different
    if (Params.From === Params.To) {
      return {
        success: false,
        errors: [{
          path: ['flags', 'to'],
          message: 'Source and destination accounts must be different',
          code: 'SAME_ACCOUNT',
        }],
      };
    }

    // Business rule: limit transfers unless --force
    const TRANSFER_LIMIT = 10000;
    if (Params.Amount > TRANSFER_LIMIT && !Params.Force) {
      Log.Warn(`Transfer of ${Params.Amount} exceeds limit of ${TRANSFER_LIMIT}`);
      return {
        success: false,
        errors: [{
          path: ['flags', 'amount'],
          message: `Amount exceeds ${TRANSFER_LIMIT}. Use --force to override.`,
          code: 'EXCEEDS_LIMIT',
        }],
      };
    }

    // Validation passed
    return { success: true };
  })
  .Run(async ({ Params, Log }) => {
    Log.Info(`Transferring $${Params.Amount} from ${Params.From} to ${Params.To}`);
    Log.Info('Transfer complete!');
  })
  .Build();

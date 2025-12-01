import type { TelemetryLogger } from '../.deps.ts';

export type TelemetryLogEntry = {
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  attributes?: Record<string, unknown>;
};

export class TelemetryLogAdapter {
  constructor(
    protected readonly logger: TelemetryLogger,
    protected readonly baseAttributes: Record<string, unknown> = {},
  ) {}

  public Info(...data: unknown[]) {
    this.write('info', data);
  }

  public Warn(...data: unknown[]) {
    this.write('warn', data);
  }

  public Error(...data: unknown[]) {
    this.write('error', data);
  }

  public Success(...data: unknown[]) {
    this.write('success', data);
  }

  protected write(level: TelemetryLogEntry['level'], data: unknown[]) {
    const message = data.map((
      d,
    ) => (typeof d === 'string' ? d : JSON.stringify(d))).join(' ');
    const attributes = { ...this.baseAttributes, levelHint: level };

    switch (level) {
      case 'info':
        this.logger.info(message, attributes);
        break;
      case 'warn':
        this.logger.warn(message, attributes);
        break;
      case 'error':
        this.logger.error(message, attributes);
        break;
      case 'success':
        this.logger.info(message, { ...attributes, success: true });
        break;
    }
  }
}

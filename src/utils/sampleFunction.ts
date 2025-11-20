import { isStatusSuccess, Status } from '../src.deps.ts';

export function sampleFunction(name: string, status: Status): string {
  const success = isStatusSuccess(status);

  return `hello ${name}: ${success}`;
}

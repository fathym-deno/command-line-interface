export function captureLogs(
  fn: () => Promise<void>,
  useOrig: boolean = false,
): Promise<string> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  let output = '';

  console.log = (...args: unknown[]) => {
    output += args.map((a) => String(a)).join(' ') + '\n';

    if (useOrig) originalLog(...args);
  };
  console.info = (...args: unknown[]) => {
    output += args.map((a) => String(a)).join(' ') + '\n';

    if (useOrig) originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    output += args.map((a) => String(a)).join(' ') + '\n';

    if (useOrig) originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    output += args.map((a) => String(a)).join(' ') + '\n';

    if (useOrig) originalError(...args);
  };

  return fn()
    .finally(() => {
      console.log = originalLog;
      console.error = originalError;
      console.info = originalInfo;
      console.warn = originalWarn;
    })
    .then(() => output);
}

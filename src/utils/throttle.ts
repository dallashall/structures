interface Throttled<Args extends unknown[]> {
  (...args: Args): void;
  /** Run a call held for the trailing edge now, so it lands before whatever comes next */
  flush(): void;
}

/**
 * Runs cb at most once per minDelayMs. A call inside the window is held and runs when
 * the window ends, with the latest arguments.
 */
export const throttled = <Args extends unknown[]>(
  cb: (...args: Args) => void,
  minDelayMs: number,
): Throttled<Args> => {
  let lastExecutionMs = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Args | null = null;

  const runHeld = (): void => {
    timeout = null;
    lastExecutionMs = Date.now();
    if (latestArgs) {
      const args = latestArgs;
      latestArgs = null;
      cb(...args);
    }
  };

  const call = (...args: Args): void => {
    const elapsed = Date.now() - lastExecutionMs;

    if (elapsed >= minDelayMs) {
      // A held call is superseded by this one
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      latestArgs = null;
      lastExecutionMs = Date.now();
      cb(...args);
      return;
    }

    latestArgs = args;
    if (!timeout) {
      timeout = setTimeout(runHeld, minDelayMs - elapsed);
    }
  };

  const flush = (): void => {
    if (!timeout) return;
    clearTimeout(timeout);
    runHeld();
  };

  return Object.assign(call, { flush });
};

export interface Throttled<Args extends unknown[]> {
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

export const asyncDebounce = <T extends (...args: any[]) => Promise<any>>(
  cb: T,
) => {
  let isRunning = false;
  let hasPending = false;
  let latestArgs: any[] = [];

  return async (...args: any[]) => {
    if (isRunning) {
      latestArgs = args;
      hasPending = true;
      return;
    }

    isRunning = true;
    let currentArgs = args;

    try {
      // Use a "do...while" or a controlled "while" to ensure we
      // check the flag, not the truthiness of the args.
      while (true) {
        await cb(...currentArgs);

        if (!hasPending) break;

        // Reset the flag and grab the next batch
        currentArgs = latestArgs;
        hasPending = false;
        latestArgs = []; // Clear for GC
      }
    } finally {
      isRunning = false;
    }
  };
};

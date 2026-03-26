export const throttled = <T extends (...args: any[]) => void>(
  cb: T,
  minDelayMs: number,
) => {
  let lastExecutionMs = 0;
  let timeout: any = null;
  let latestArgs: any[] | null = null;

  return (...args: any[]) => {
    const now = Date.now();
    const elapsed = now - lastExecutionMs;

    if (elapsed >= minDelayMs) {
      // If a trailing timer was waiting, clear it since we're firing now
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      lastExecutionMs = now;
      cb(...args);
    } else {
      // Buffer the latest arguments
      latestArgs = args;

      // If no timer is already waiting to "drain" the buffer, start one
      if (!timeout) {
        const remaining = minDelayMs - elapsed;
        timeout = setTimeout(() => {
          timeout = null;
          lastExecutionMs = Date.now();
          if (latestArgs) {
            cb(...latestArgs);
            latestArgs = null;
          }
        }, remaining);
      }
    }
  };
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

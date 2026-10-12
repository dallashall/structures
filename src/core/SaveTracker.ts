/**
 * SaveTracker - Whether every project write has reached IndexedDB
 *
 * Each store hands its write promises to track(). A write counts as saved when its
 * transaction commits, so the state reads "saved" only when the disk holds what the editor shows.
 * A failed write holds the "error" state until a later write commits.
 *
 * Events:
 * - save:started - the first write began while none were in flight
 * - save:completed - the last in-flight write committed
 * - save:failed - a write failed
 */

import { EventEmitter } from './EventEmitter';

export type SaveState = 'saving' | 'saved' | 'error';

class SaveTracker extends EventEmitter {
  private static instance: SaveTracker;
  private inFlight = 0;
  private hasFailed = false;

  private constructor() {
    super();
  }

  static getInstance(): SaveTracker {
    if (!SaveTracker.instance) {
      SaveTracker.instance = new SaveTracker();
    }
    return SaveTracker.instance;
  }

  getSaveState(): SaveState {
    if (this.inFlight > 0) return 'saving';
    return this.hasFailed ? 'error' : 'saved';
  }

  /**
   * Returns the same promise, so callers keep its result and its rejection
   */
  track<T>(write: Promise<T>): Promise<T> {
    this.inFlight += 1;
    if (this.inFlight === 1) this.emit('save:started');
    write.then(this.handleCommitted, this.handleFailed);
    return write;
  }

  private handleCommitted = (): void => {
    this.inFlight -= 1;
    this.hasFailed = false;
    if (this.inFlight === 0) this.emit('save:completed');
  };

  private handleFailed = (): void => {
    this.inFlight -= 1;
    this.hasFailed = true;
    this.emit('save:failed');
  };
}

export const saveTracker = SaveTracker.getInstance();

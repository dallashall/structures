/**
 * HistoryAnnouncer - Turns each undo and redo into a toast that expires on its own
 *
 * A toast lives in two phases. It shows until VISIBLE_MS passes or newer toasts push it past
 * MAX_VISIBLE. It then leaves, and stays in the list until remove() reports its exit animation done.
 *
 * Events:
 * - toast:shown - a new toast joined the end of the list
 * - toast:expired - one or more toasts started leaving
 * - toast:removed - a toast finished leaving and left the list
 */

import { EventEmitter } from './EventEmitter';
import { editHistory, type HistoryStepNotice } from './EditHistory';

export interface HistoryToast {
  key: number;
  kind: 'undo' | 'redo';
  text: string;
  leaving: boolean;
}

const VISIBLE_MS = 2500;
const MAX_VISIBLE = 4;

const isStaying = (toast: HistoryToast): boolean => !toast.leaving;
const toKey = (toast: HistoryToast): number => toast.key;

class HistoryAnnouncer extends EventEmitter {
  private static instance: HistoryAnnouncer;

  // Oldest first. Replaced, never mutated, so React sees each change as a new array.
  private toasts: HistoryToast[] = [];
  private nextKey = 0;

  private constructor() {
    super();
    editHistory.on('history:step-undone', this.handleUndone);
    editHistory.on('history:step-redone', this.handleRedone);
  }

  static getInstance(): HistoryAnnouncer {
    if (!HistoryAnnouncer.instance) {
      HistoryAnnouncer.instance = new HistoryAnnouncer();
    }
    return HistoryAnnouncer.instance;
  }

  getToasts(): HistoryToast[] {
    return this.toasts;
  }

  /**
   * Drop a toast whose exit animation finished
   */
  remove(key: number): void {
    const isOther = (toast: HistoryToast): boolean => toast.key !== key;
    this.toasts = this.toasts.filter(isOther);
    this.emit('toast:removed', key);
  }

  private handleUndone = ({ actionId }: HistoryStepNotice): void => {
    void this.announce('undo', actionId);
  };

  private handleRedone = ({ actionId }: HistoryStepNotice): void => {
    void this.announce('redo', actionId);
  };

  private async announce(kind: 'undo' | 'redo', actionId: string): Promise<void> {
    const label = await editHistory.describe(actionId);
    this.show(kind, `${kind === 'undo' ? 'Undid' : 'Redid'} ${label}`);
  }

  private show(kind: 'undo' | 'redo', text: string): void {
    const key = ++this.nextKey;
    this.toasts = [...this.toasts, { key, kind, text, leaving: false }];
    this.emit('toast:shown', key);

    const staying = this.toasts.filter(isStaying);
    this.expire(staying.slice(0, Math.max(0, staying.length - MAX_VISIBLE)).map(toKey));

    const expireThis = (): void => this.expire([key]);
    setTimeout(expireThis, VISIBLE_MS);
  }

  private expire(keys: number[]): void {
    const expiring = new Set(keys);
    const isExpiring = (toast: HistoryToast): boolean => expiring.has(toast.key) && !toast.leaving;
    if (!this.toasts.some(isExpiring)) return;

    const markLeaving = (toast: HistoryToast): HistoryToast =>
      isExpiring(toast) ? { ...toast, leaving: true } : toast;
    this.toasts = this.toasts.map(markLeaving);
    this.emit('toast:expired', keys);
  }
}

export const historyAnnouncer = HistoryAnnouncer.getInstance();

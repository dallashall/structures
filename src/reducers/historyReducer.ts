/**
 * History reducer - folds action:started markers into undo and redo stacks.
 *
 * History is linear. An undo must target the top of the undo stack and a redo the top of the
 * redo stack. A marker that targets anything else changes nothing, so a writer with stale stacks
 * cannot reorder history. Its step is lost instead. A new edit discards the redo stack, and the
 * discarded actions stay undone permanently.
 */

import { ACTION_STARTED, type ActionStartedData, type Event } from '../core/EventLog';

export interface HistoryState {
  undoStack: string[];   // Action IDs, oldest first
  redoStack: string[];   // Action IDs, next redo last
  undone: Set<string>;   // Every action whose events replay must skip
}

type HistoryStep =
  | { kind: 'edit'; actionId: string }
  | { kind: 'undo' | 'redo'; actionId: string }
  | null;

export function createEmptyHistory(): HistoryState {
  return { undoStack: [], redoStack: [], undone: new Set() };
}

export const isActionStart = (event: Event): boolean => event.type === ACTION_STARTED;

export const isHistoryStep = (event: Event): boolean => {
  if (!isActionStart(event)) return false;
  const { kind } = event.data as ActionStartedData;
  return kind === 'undo' || kind === 'redo';
};

const moveTop = (from: string[], to: string[], target: string | undefined): boolean => {
  if (!target || from[from.length - 1] !== target) return false;
  from.pop();
  to.push(target);
  return true;
};

/**
 * Apply one action:started marker in place. Returns the step it took, or null when it changed nothing.
 */
export function applyHistoryMarker(state: HistoryState, event: Event): HistoryStep {
  if (!isActionStart(event) || !event.actionId) return null;
  const { kind, target } = event.data as ActionStartedData;

  if (kind === 'undo') {
    if (!moveTop(state.undoStack, state.redoStack, target)) return null;
    state.undone.add(target!);
    return { kind, actionId: target! };
  }

  if (kind === 'redo') {
    if (!moveTop(state.redoStack, state.undoStack, target)) return null;
    state.undone.delete(target!);
    return { kind, actionId: target! };
  }

  state.undoStack.push(event.actionId);
  state.redoStack = [];
  return { kind: 'edit', actionId: event.actionId };
}

/**
 * Fold markers in ID order into a fresh history
 */
export function foldHistory(events: Event[]): HistoryState {
  const state = createEmptyHistory();
  for (const event of events) {
    applyHistoryMarker(state, event);
  }
  return state;
}

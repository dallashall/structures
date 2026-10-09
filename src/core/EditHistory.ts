/**
 * EditHistory - Undo and redo stacks for the open project
 *
 * The stacks are folded from action:started markers in the EventLog, so they survive a reload.
 * Undo and redo write an empty action that names its target. ModelReplayer then replays the
 * project and skips undone actions. No event stores the state an undo restores.
 *
 * Notifications:
 * - history:replayed - stacks rebuilt for a newly opened project
 * - history:step-recorded - a new edit joined the undo stack and cleared the redo stack
 * - history:step-undone / history:step-redone - payload { actionId, label }
 */

import { EventEmitter } from './EventEmitter';
import {
  eventLog,
  ACTION_STARTED,
  type ActionStartedData,
  type Event,
} from './EventLog';
import { editorState } from './EditorState';
import { draftingService } from './DraftingService';
import { toolRegistry } from './tools/ToolRegistry';
import {
  applyHistoryMarker,
  createEmptyHistory,
  foldHistory,
  type HistoryState,
} from '../reducers/historyReducer';

export interface HistoryStepNotice {
  actionId: string;
  label: string;
}

const countOf = (events: Event[], type: string, field: 'blocks' | 'positions'): number => {
  const sumField = (total: number, event: Event): number =>
    event.type === type ? total + (event.data as Record<string, unknown[]>)[field].length : total;
  return events.reduce(sumField, 0);
};

const plural = (count: number): string => (count === 1 ? '1 block' : `${count} blocks`);

/**
 * Human-readable name for one action, built from its marker and its events
 */
export function describeAction(marker: ActionStartedData, events: Event[]): string {
  switch (marker.kind) {
    case 'paint': {
      const tool = toolRegistry.getRegistration(marker.tool ?? '')?.label ?? 'Paint';
      const placed = countOf(events, 'model:blocksPlaced', 'blocks');
      const removed = countOf(events, 'model:blocksRemoved', 'positions');
      if (removed === 0) return `${tool} (${plural(placed)})`;
      if (placed === 0) return `${tool} (${plural(removed)} removed)`;
      return `${tool} (${plural(placed)}, ${removed} removed)`;
    }
    case 'dimension-expand':
    case 'dimension-shrink': {
      const isDimensionEvent = (event: Event): boolean => event.type.startsWith('model:dimension');
      const direction = (events.find(isDimensionEvent)?.data as { direction?: string } | undefined)?.direction;
      const verb = marker.kind === 'dimension-expand' ? 'Expand' : 'Shrink';
      return direction ? `${verb} ${direction}` : verb;
    }
    case 'metablock-place':
      return 'Move meta block';
    case 'metablock-confirm':
      return 'Confirm meta block';
    default:
      return 'Edit';
  }
}

class EditHistory extends EventEmitter {
  private static instance: EditHistory;

  private projectId: string | null = null;
  private state: HistoryState = createEmptyHistory();
  private markers = new Map<string, ActionStartedData>();
  // Highest marker ID folded into state
  private latestMarkerId = 0;
  // Markers that arrive while replay() reads the log. Null when no replay is running.
  private bufferedMarkers: Event[] | null = null;
  private generation = 0;
  // Undo and redo run one at a time, so each reads the stacks after the previous step landed
  private stepQueue: Promise<void> = Promise.resolve();

  private constructor() {
    super();
    eventLog.on('event:appended', this.handleEvent);
    editorState.on('project:switched', this.handleProjectSwitched);
  }

  static getInstance(): EditHistory {
    if (!EditHistory.instance) {
      EditHistory.instance = new EditHistory();
    }
    return EditHistory.instance;
  }

  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  undo(): Promise<void> {
    return this.enqueueStep('undo');
  }

  redo(): Promise<void> {
    return this.enqueueStep('redo');
  }

  /**
   * Rebuild the stacks from the log for one project
   */
  async replay(projectId: string | null): Promise<void> {
    const generation = ++this.generation;
    this.projectId = projectId;
    this.state = createEmptyHistory();
    this.markers.clear();
    this.latestMarkerId = 0;

    if (!projectId) {
      this.bufferedMarkers = null;
      this.emit('history:replayed');
      return;
    }

    this.bufferedMarkers = [];
    const markers = await eventLog.getEvents({ projectId, types: [ACTION_STARTED] });
    if (generation !== this.generation) return;

    const buffered = this.bufferedMarkers;
    this.bufferedMarkers = null;
    this.state = foldHistory(markers);
    markers.forEach(this.rememberMarker);
    buffered.forEach(this.applyMarker);
    this.emit('history:replayed');
  }

  private handleProjectSwitched = (projectId: string | null): void => {
    void this.replay(projectId);
  };

  private handleEvent = (event: Event): void => {
    if (event.type !== ACTION_STARTED || event.projectId !== this.projectId) return;

    if (this.bufferedMarkers) {
      this.bufferedMarkers.push(event);
      return;
    }
    this.applyMarker(event);
  };

  private rememberMarker = (event: Event): void => {
    this.markers.set(event.actionId!, event.data as ActionStartedData);
    this.latestMarkerId = Math.max(this.latestMarkerId, event.id!);
  };

  private applyMarker = (event: Event): void => {
    if (event.id! <= this.latestMarkerId) return;
    this.rememberMarker(event);

    const step = applyHistoryMarker(this.state, event);
    if (!step) return;

    if (step.kind === 'edit') {
      this.emit('history:step-recorded');
      return;
    }
    void this.announce(step.kind, step.actionId);
  };

  private async announce(kind: 'undo' | 'redo', actionId: string): Promise<void> {
    const marker = this.markers.get(actionId);
    const label = marker ? describeAction(marker, await eventLog.getActionEvents(actionId)) : 'Edit';
    const notice: HistoryStepNotice = { actionId, label };
    this.emit(kind === 'undo' ? 'history:step-undone' : 'history:step-redone', notice);
  }

  private enqueueStep(kind: 'undo' | 'redo'): Promise<void> {
    const runStep = (): Promise<void> => this.step(kind);
    this.stepQueue = this.stepQueue.then(runStep, runStep);
    return this.stepQueue;
  }

  private async step(kind: 'undo' | 'redo'): Promise<void> {
    draftingService.cancel();
    // A paint stroke still committing would otherwise land above the action this step targets
    await eventLog.settled();

    const stack = kind === 'undo' ? this.state.undoStack : this.state.redoStack;
    const target = stack[stack.length - 1];
    if (!target || !this.projectId) return;

    await eventLog.appendAction(this.projectId, { kind, target, events: [] });
  }
}

export const editHistory = EditHistory.getInstance();

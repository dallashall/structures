/**
 * ModelReplayer - Keeps one Model current with the EventLog for the open project
 *
 * ModelProjection owns the only one. Model events apply in place.
 * An undo or redo marker cannot apply in place because it names no blocks,
 * so it triggers a full replay of the project that skips undone actions.
 */

import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import {
  applyModelEvent,
  createEmptyModel,
  replayModel,
  REPLAY_EVENT_TYPES,
  type Model,
} from '../reducers/modelReducer';
import { isHistoryStep } from '../reducers/historyReducer';

type ReceiveResult = 'applied' | 'replaying' | 'ignored';

export class ModelReplayer {
  private model: Model = createEmptyModel();
  // Every current-project event up to this ID is reflected in the model
  private latestEventId = 0;
  // Bumped by reset and by each replay, so a stale replay never overwrites newer state
  private generation = 0;
  // Reads wait on this, so a read never returns the model from before an undo
  private pendingReplay: Promise<void> | null = null;

  constructor(private readonly onReplayed: () => void) {}

  getModel(): Model {
    return this.model;
  }

  reset(): void {
    this.model = createEmptyModel();
    this.latestEventId = 0;
    this.generation++;
  }

  receive(event: Event): ReceiveResult {
    if (event.projectId !== editorState.getCurrentProjectId()) return 'ignored';
    if (event.id! <= this.latestEventId) return 'ignored';

    if (isHistoryStep(event)) {
      void this.startReplay();
      return 'replaying';
    }
    // The running replay picks this event up when it catches up, so the model it discards never shows it
    if (this.pendingReplay) return 'replaying';

    this.latestEventId = event.id!;
    return applyModelEvent(this.model, event) ? 'applied' : 'ignored';
  }

  /**
   * Apply every event appended since the last read, from any tab
   */
  async ensureFresh(): Promise<void> {
    await this.settleReplays();
    await this.applyNewEvents();
    // applyNewEvents returns early when a replay starts or overtakes it
    await this.settleReplays();
  }

  private async settleReplays(): Promise<void> {
    while (this.pendingReplay) {
      await this.pendingReplay;
    }
  }

  private async applyNewEvents(): Promise<void> {
    const latestEventId = await eventLog.getLatestEventId();
    if (latestEventId <= this.latestEventId) return;

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    if (this.latestEventId === 0) {
      await this.startReplay();
      return;
    }

    const generation = this.generation;
    const events = await eventLog.getEvents({
      fromId: this.latestEventId + 1,
      toId: latestEventId,
      types: REPLAY_EVENT_TYPES,
      projectId,
    });
    if (generation !== this.generation) return;

    if (events.some(isHistoryStep)) {
      await this.startReplay();
      return;
    }

    for (const event of events) {
      // A concurrent ensureFresh may have applied it already, and a second dimension shift would move blocks twice
      if (event.id! > this.latestEventId) {
        applyModelEvent(this.model, event);
        this.latestEventId = event.id!;
      }
    }
    this.latestEventId = Math.max(this.latestEventId, latestEventId);
  }

  private startReplay(): Promise<void> {
    const replay = this.replay();
    this.pendingReplay = replay;
    const clearPending = (): void => {
      if (this.pendingReplay === replay) this.pendingReplay = null;
    };
    replay.then(clearPending, clearPending);
    return replay;
  }

  private async replay(): Promise<void> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const generation = ++this.generation;
    const latestEventId = await eventLog.getLatestEventId();
    const events = await eventLog.getEvents({ toId: latestEventId, types: REPLAY_EVENT_TYPES, projectId });
    if (generation !== this.generation) return;

    this.model = replayModel(events);
    this.latestEventId = latestEventId;

    // Events committed during the read are past latestEventId. ensureFresh would wait on this replay.
    await this.applyNewEvents();
    if (generation === this.generation) {
      this.onReplayed();
    }
  }
}

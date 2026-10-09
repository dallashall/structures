/**
 * Project fixture for projection tests
 *
 * Projections only apply events whose projectId matches EditorState's current project,
 * and they are singletons that keep state between tests. startProject() gives each test
 * an empty log, a fresh current project, reset projections, and empty undo history.
 */

import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';
import { editHistory } from '../core/EditHistory';
import type { ActionDraft } from '../core/EventLog';

export const PROJECT_ID = 'project-under-test';
export const OTHER_PROJECT_ID = 'other-project';

export async function startProject(): Promise<void> {
  await eventLog.clear();
  editorState.setCurrentProjectId(PROJECT_ID);
  metadataProjection.reset();
  modelProjection.reset();
  blockProjection.reset();
  await editHistory.replay(PROJECT_ID);
}

/**
 * Append an event to the current test project
 */
export function append(type: string, data: unknown): Promise<number> {
  return eventLog.append(type, data, PROJECT_ID);
}

/**
 * Append an event to a project the projections must ignore
 */
export function appendToOtherProject(type: string, data: unknown): Promise<number> {
  return eventLog.append(type, data, OTHER_PROJECT_ID);
}

/**
 * Append one undoable action to the current test project. Returns its action ID.
 */
export function appendAction(draft: ActionDraft): Promise<string> {
  return eventLog.appendAction(PROJECT_ID, draft);
}

/**
 * Append one paint action that places stone at each x on row y=0, z=0
 */
export function paintStone(...xs: number[]): Promise<string> {
  const toStone = (x: number) => ({ position: { x, y: 0, z: 0 }, blockType: 'stone' });
  return appendAction({
    kind: 'paint',
    tool: 'point',
    events: [{ type: 'model:blocksPlaced', data: { blocks: xs.map(toStone) } }],
  });
}

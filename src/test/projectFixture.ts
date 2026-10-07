/**
 * Project fixture for projection tests
 *
 * Projections only apply events whose projectId matches EditorState's current project,
 * and they are singletons that keep state between tests. startProject() gives each test
 * an empty log, a fresh current project, and reset projections.
 */

import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';

export const PROJECT_ID = 'project-under-test';
export const OTHER_PROJECT_ID = 'other-project';

export async function startProject(): Promise<void> {
  await eventLog.clear();
  editorState.setCurrentProjectId(PROJECT_ID);
  metadataProjection.reset();
  modelProjection.reset();
  blockProjection.reset();
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

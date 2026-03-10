/**
 * Projections - Read models that materialize state from event logs
 *
 * Architecture:
 * - BlockProjection: Consumes ModelHistory (block events) + EventLog (dimension events)
 * - MetadataProjection: Consumes EventLog (metadata events)
 * - ProjectView: Combines both projections into complete Project state
 */

export { blockProjection } from './BlockProjection';
export { metadataProjection } from './MetadataProjection';
export { modelProjection } from './ModelProjection';
export { projectView } from './ProjectView';
export type { StorageMetadata } from '../types';

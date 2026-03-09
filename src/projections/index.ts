/**
 * Projections - Read models that materialize state from event logs
 *
 * Architecture:
 * - BlockProjection: Consumes ModelHistory (block events) + EventLog (dimension events)
 * - MetadataProjection: Consumes EventLog (metadata events)
 * - ProjectView: Combines both projections into complete Project state
 */

export { blockProjection } from './BlockProjection';
export { metadataProjection, type ProjectMetadata } from './MetadataProjection';
export { projectView } from './ProjectView';

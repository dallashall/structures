import { metadataProjection } from './MetadataProjection';
import { modelProjection } from './ModelProjection';
import type { Project } from '../types';

/**
 * ProjectView - Combines ModelProjection + MetadataProjection
 *
 * Provides complete Project state by combining:
 * - Metadata (id, name, created, modified)
 * - Model (dimensions, metaBlock, blocks)
 *
 * This is a convenience layer for querying complete project state.
 * Components should subscribe to individual projections for updates.
 *
 * Reads are always fresh - projections check EventLog for new events before returning.
 */
class ProjectView {
  private static instance: ProjectView;

  private constructor() {}

  static getInstance(): ProjectView {
    if (!ProjectView.instance) {
      ProjectView.instance = new ProjectView();
    }
    return ProjectView.instance;
  }

  /**
   * Get complete project state (metadata + model)
   * Always fresh - reads latest from both projections
   */
  async getProject(): Promise<Project | null> {
    const metadata = await metadataProjection.getMetadata();
    if (!metadata) return null;

    const model = await modelProjection.getModel();

    return {
      ...metadata,
      ...model,
    };
  }

  /**
   * Get cached project state (synchronous)
   * Use in render loops where projections are guaranteed fresh
   */
  getCached(): Project | null {
    const metadata = metadataProjection.getCached();
    if (!metadata) return null;

    const model = modelProjection.getCached();

    return {
      ...metadata,
      ...model,
    };
  }
}

export const projectView = ProjectView.getInstance();

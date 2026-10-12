import { metadataProjection } from './MetadataProjection';
import { modelProjection } from './ModelProjection';
import type { Project } from '../types';

/**
 * ProjectView - One Project object joined from MetadataProjection and ModelProjection.
 * It emits nothing. Subscribers listen to the two projections.
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

  async getProject(): Promise<Project | null> {
    const metadata = await metadataProjection.getMetadata();
    if (!metadata) return null;

    const model = await modelProjection.getModel();

    return {
      ...metadata,
      ...model,
    };
  }

  // No freshness check, for render paths that already awaited getProject()
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

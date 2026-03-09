import { EventEmitter } from '../core/EventEmitter';
import { blockProjection } from './BlockProjection';
import { metadataProjection } from './MetadataProjection';
import type { Project } from '../types';

/**
 * ProjectView - Combines BlockProjection + MetadataProjection
 *
 * Provides complete Project state by combining:
 * - Metadata (from EventLog via MetadataProjection)
 * - Blocks (from ModelHistory via BlockProjection)
 *
 * This is the main read interface for the complete project state.
 * Components should subscribe to 'project:updated' and call getProject().
 */
class ProjectView extends EventEmitter {
  private static instance: ProjectView;

  private constructor() {
    super();

    // Re-emit when either projection updates
    blockProjection.on('blocks:updated', () => this.emitUpdate());
    metadataProjection.on('metadata:updated', () => this.emitUpdate());
  }

  static getInstance(): ProjectView {
    if (!ProjectView.instance) {
      ProjectView.instance = new ProjectView();
    }
    return ProjectView.instance;
  }

  private emitUpdate(): void {
    const project = this.getProject();
    this.emit('project:updated', project);
  }

  /**
   * Get complete project state (metadata + blocks)
   */
  getProject(): Project | null {
    const metadata = metadataProjection.getMetadata();
    if (!metadata) return null;

    return {
      ...metadata,
      blocks: blockProjection.getBlocks(),
    };
  }
}

export const projectView = ProjectView.getInstance();

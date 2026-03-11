import { eventLog } from '../core/EventLog';
import { storage } from '../core/Storage';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import { generateUUID } from '../utils/uuid';
import type { Dimensions } from '../types';

/**
 * CreateProjectCommand - Creates a new project
 *
 * Appends to: EventLog (metadata:created, model:initialized)
 * Saves to: Storage (project metadata for browser)
 * Queries: None
 * Validates: name not empty, dimensions > 0
 */
export class CreateProjectCommand {
  async execute(name: string, dimensions: Dimensions): Promise<string> {
    // Validate
    if (!name || name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.depth <= 0) {
      throw new Error('Dimensions must be greater than 0');
    }

    // Generate project ID
    const projectId = generateUUID();
    const now = new Date();

    // Reset projections for new project
    metadataProjection.reset();
    modelProjection.reset();

    // Set as current project and reset placement mode
    editorState.setCurrentProjectId(projectId);
    editorState.setPlacementMode(false);

    // Append metadata:created event (with projectId)
    await eventLog.append('metadata:created', {
      id: projectId,
      name,
    }, projectId);

    // Append model:initialized event (with projectId)
    await eventLog.append('model:initialized', {
      projectId,
      dimensions,
    }, projectId);

    // Save project metadata to Storage for project browser
    storage.saveProjectMetadata({
      id: projectId,
      name,
      dimensions,
      created: now,
      modified: now,
      blockCount: 0,
      thumbnail: '', // Empty thumbnail for now
    });

    // Set as last opened project
    storage.setLastOpenedProjectId(projectId);

    return projectId;
  }
}

export const createProjectCommand = new CreateProjectCommand();

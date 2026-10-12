import { eventLog } from '../core/EventLog';
import { storage } from '../core/Storage';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';
import { generateUUID } from '../utils/uuid';
import type { Dimensions } from '../types';

/**
 * CreateProjectCommand - Creates a new project and makes it current
 *
 * Appends to: EventLog (metadata:created, model:initialized), outside undo history
 * Saves to: Storage (last opened project ID)
 * Validates: name not empty, dimensions > 0
 * The projections reset before the rows append, so they never fold the new rows onto the previous project.
 */
class CreateProjectCommand {
  async execute(name: string, dimensions: Dimensions): Promise<string> {
    if (!name || name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.depth <= 0) {
      throw new Error('Dimensions must be greater than 0');
    }

    const projectId = generateUUID();

    metadataProjection.reset();
    modelProjection.reset();
    blockProjection.reset();

    editorState.setCurrentProjectId(projectId);
    editorState.setPlacementMode(false);

    await eventLog.append('metadata:created', {
      id: projectId,
      name,
    }, projectId);

    await eventLog.append('model:initialized', {
      projectId,
      dimensions,
    }, projectId);

    await storage.setLastOpenedProjectId(projectId);

    return projectId;
  }
}

export const createProjectCommand = new CreateProjectCommand();

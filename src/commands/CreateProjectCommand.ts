import { eventLog } from '../core/EventLog';
import { generateUUID } from '../utils/uuid';
import type { Dimensions } from '../types';

/**
 * CreateProjectCommand - Creates a new project
 *
 * Appends to: EventLog (metadata:created, model:initialized)
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

    // Append metadata:created event
    await eventLog.append('metadata:created', {
      id: projectId,
      name,
    });

    // Append model:initialized event
    await eventLog.append('model:initialized', {
      dimensions,
    });

    return projectId;
  }
}

export const createProjectCommand = new CreateProjectCommand();

import { eventLog } from '../core/EventLog';
import { storage } from '../core/Storage';

/**
 * RenameProjectCommand - Renames any stored project, open or not
 *
 * Appends to: EventLog (metadata:renamed)
 * Queries: Storage (the project must exist and no other project may hold the name)
 * Throws RenameProjectError with a message for the user when validation fails.
 */
export class RenameProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenameProjectError';
  }
}

class RenameProjectCommand {
  private static instance: RenameProjectCommand;

  private constructor() {}

  static getInstance(): RenameProjectCommand {
    if (!RenameProjectCommand.instance) {
      RenameProjectCommand.instance = new RenameProjectCommand();
    }
    return RenameProjectCommand.instance;
  }

  async execute(projectId: string, name: string): Promise<void> {
    const newName = name.trim();
    if (!newName) {
      throw new RenameProjectError('A project needs a name.');
    }

    const projects = await storage.listProjects();
    const isTarget = (project: { id: string }): boolean => project.id === projectId;
    const project = projects.find(isTarget);
    if (!project) {
      throw new RenameProjectError('That project no longer exists.');
    }
    if (project.name === newName) return;

    const holdsName = (other: { id: string; name: string }): boolean =>
      other.id !== projectId && other.name === newName;
    if (projects.some(holdsName)) {
      throw new RenameProjectError('Another project already has that name.');
    }

    await eventLog.append('metadata:renamed', { previousName: project.name, newName }, projectId);
  }
}

export const renameProjectCommand = RenameProjectCommand.getInstance();

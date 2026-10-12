import { eventLog } from '../core/EventLog';
import type { Event } from '../core/EventLog';
import { storage } from '../core/Storage';
import { openTextFile } from '../utils/fileAccess';
import { generateUUID } from '../utils/uuid';
import {
  PROJECT_FILE_TYPE,
  parseProjectFile,
  toLoadedEvents,
  toProjectName,
  toUnusedName,
} from '../utils/projectFile';
import type { StorageMetadata } from '../types';
import { openProjectCommand } from './OpenProjectCommand';

/**
 * LoadProjectFileCommand - Adds a project from a file on disk and opens it
 *
 * Appends to: EventLog (every row in the file, plus metadata:renamed when the name is taken,
 *   in one transaction, under a new project ID)
 * Queries: Storage (the names of existing projects)
 * Validates: the file format and version (throws ProjectFileError)
 * The new project ID lets a file load beside the project it was saved from.
 */
class LoadProjectFileCommand {
  private static instance: LoadProjectFileCommand;

  private constructor() {}

  static getInstance(): LoadProjectFileCommand {
    if (!LoadProjectFileCommand.instance) {
      LoadProjectFileCommand.instance = new LoadProjectFileCommand();
    }
    return LoadProjectFileCommand.instance;
  }

  /**
   * Returns the new project ID, or null when the user cancels the file picker
   */
  async execute(): Promise<string | null> {
    const text = await openTextFile(`${PROJECT_FILE_TYPE.extension},${PROJECT_FILE_TYPE.mimeType}`);
    if (text === null) return null;
    return this.load(text);
  }

  /**
   * Add and open the project in a file's text. Returns the new project ID.
   */
  async load(text: string): Promise<string> {
    const file = parseProjectFile(text);
    const projectId = generateUUID();
    const events = toLoadedEvents(file, projectId, generateUUID);

    const toName = (project: StorageMetadata): string => project.name;
    const takenNames = new Set((await storage.listProjects()).map(toName));
    const fileName = toProjectName(file);
    const newName = toUnusedName(fileName, takenNames);
    if (newName !== fileName) {
      const renamed: Event = {
        type: 'metadata:renamed',
        data: { previousName: fileName, newName },
        timestamp: Date.now(),
        projectId,
      };
      events.push(renamed);
    }

    await eventLog.appendBatch(events);
    await openProjectCommand.execute(projectId);
    return projectId;
  }
}

export const loadProjectFileCommand = LoadProjectFileCommand.getInstance();

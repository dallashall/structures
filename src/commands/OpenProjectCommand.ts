import { storage } from '../core/Storage';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';

/**
 * OpenProjectCommand - Makes a project current and replays its events
 *
 * Appends to: nothing (opening a project changes editor state, not the model)
 * Saves to: Storage (last opened project ID)
 * Queries: Storage (the project must exist in the event log)
 * Resolves after all projections hold the project's state, so the editor can render it immediately.
 */
class OpenProjectCommand {
  private static instance: OpenProjectCommand;

  private constructor() {}

  static getInstance(): OpenProjectCommand {
    if (!OpenProjectCommand.instance) {
      OpenProjectCommand.instance = new OpenProjectCommand();
    }
    return OpenProjectCommand.instance;
  }

  /**
   * Returns false when the event log has no such project
   */
  async execute(projectId: string): Promise<boolean> {
    if (!(await storage.getProject(projectId))) return false;

    editorState.setCurrentProjectId(projectId);
    metadataProjection.reset();
    modelProjection.reset();
    blockProjection.reset();
    await storage.setLastOpenedProjectId(projectId);

    await Promise.all([
      metadataProjection.ensureFresh(),
      modelProjection.ensureFresh(),
      blockProjection.ensureFresh(),
    ]);
    return true;
  }

  /**
   * Reopen the project open in the previous session. Returns false when there is none.
   */
  async executeLastOpened(): Promise<boolean> {
    const projectId = await storage.getLastOpenedProjectId();
    return projectId ? this.execute(projectId) : false;
  }
}

export const openProjectCommand = OpenProjectCommand.getInstance();

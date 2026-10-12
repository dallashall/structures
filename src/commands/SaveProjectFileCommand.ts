import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';
import { saveTextFile } from '../utils/fileAccess';
import { PROJECT_FILE_TYPE, serializeProjectFile, toProjectFile, toProjectFileName } from '../utils/projectFile';

/**
 * SaveProjectFileCommand - Writes the current project's event log to a file on disk
 *
 * Appends to: nothing (the project already persists in the EventLog on every action)
 * Queries: EventLog (the project's events), MetadataProjection (the name for the file)
 * Waits for pending action writes, so the file holds every action the user made before saving.
 */
class SaveProjectFileCommand {
  private static instance: SaveProjectFileCommand;

  private constructor() {}

  static getInstance(): SaveProjectFileCommand {
    if (!SaveProjectFileCommand.instance) {
      SaveProjectFileCommand.instance = new SaveProjectFileCommand();
    }
    return SaveProjectFileCommand.instance;
  }

  /**
   * Returns false when the user cancels the save picker
   */
  async execute(): Promise<boolean> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      throw new Error('No current project');
    }

    await eventLog.settled();
    const [events, metadata] = await Promise.all([
      eventLog.getEvents({ projectId }),
      metadataProjection.getMetadata(),
    ]);
    const name = metadata?.name ?? '';
    const file = toProjectFile(name, events, Date.now());

    return saveTextFile(toProjectFileName(name), serializeProjectFile(file), PROJECT_FILE_TYPE);
  }
}

export const saveProjectFileCommand = SaveProjectFileCommand.getInstance();

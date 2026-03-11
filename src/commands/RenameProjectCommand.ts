import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { metadataProjection } from '../projections/MetadataProjection';

/**
 * RenameProjectCommand - Renames the current project
 *
 * Appends to: EventLog (metadata:renamed)
 * Queries: MetadataProjection (to verify project exists)
 * Validates: name not empty, name different from current
 */
export class RenameProjectCommand {
  async execute(newName: string): Promise<void> {
    // Validate
    if (!newName || newName.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    // Query current metadata
    const metadata = await metadataProjection.getMetadata();
    if (!metadata) {
      throw new Error('No active project');
    }

    // Check if name actually changed
    if (metadata.name === newName) {
      return; // No-op if name unchanged
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      throw new Error('No current project');
    }

    // Append to EventLog
    await eventLog.append('metadata:renamed', {
      previousName: metadata.name,
      newName,
    }, projectId);
  }
}

export const renameProjectCommand = new RenameProjectCommand();

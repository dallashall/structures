import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import type { Vector3D } from '../types';

/**
 * SetMetaBlockCommand - Place or move the meta block
 *
 * Appends one metablock-place action holding model:metaBlockPlaced
 */
class SetMetaBlockCommand {
  private static instance: SetMetaBlockCommand;

  private constructor() {}

  static getInstance(): SetMetaBlockCommand {
    if (!SetMetaBlockCommand.instance) {
      SetMetaBlockCommand.instance = new SetMetaBlockCommand();
    }
    return SetMetaBlockCommand.instance;
  }

  async execute(position: Vector3D): Promise<void> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      console.error('SetMetaBlockCommand: No current project');
      return;
    }

    await eventLog.appendAction(projectId, {
      kind: 'metablock-place',
      events: [{ type: 'model:metaBlockPlaced', data: { position } }],
    });

    console.log(`Meta block placed at (${position.x}, ${position.y}, ${position.z})`);
  }
}

export const setMetaBlockCommand = SetMetaBlockCommand.getInstance();

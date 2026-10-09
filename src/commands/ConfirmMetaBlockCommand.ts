import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { modelProjection } from '../projections/ModelProjection';

/**
 * ConfirmMetaBlockCommand - Finalize meta block placement
 *
 * Appends one metablock-confirm action holding model:metaBlockConfirmed
 */
class ConfirmMetaBlockCommand {
  private static instance: ConfirmMetaBlockCommand;

  private constructor() {}

  static getInstance(): ConfirmMetaBlockCommand {
    if (!ConfirmMetaBlockCommand.instance) {
      ConfirmMetaBlockCommand.instance = new ConfirmMetaBlockCommand();
    }
    return ConfirmMetaBlockCommand.instance;
  }

  async execute(): Promise<void> {
    console.log('ConfirmMetaBlockCommand: Execute called');

    const metaBlock = await modelProjection.getMetaBlock();
    console.log('ConfirmMetaBlockCommand: MetaBlock:', metaBlock);

    if (!metaBlock) {
      console.error('ConfirmMetaBlockCommand: No meta block to confirm');
      return;
    }

    if (metaBlock.isConfirmed) {
      console.log('ConfirmMetaBlockCommand: Meta block already confirmed');
      return;
    }

    // Append to EventLog
    const projectId = editorState.getCurrentProjectId();
    console.log('ConfirmMetaBlockCommand: Current project ID:', projectId);

    if (!projectId) {
      console.error('ConfirmMetaBlockCommand: No current project');
      return;
    }

    console.log('ConfirmMetaBlockCommand: Appending confirmation event');
    await eventLog.appendAction(projectId, {
      kind: 'metablock-confirm',
      events: [{ type: 'model:metaBlockConfirmed', data: {} }],
    });

    // Exit placement mode after confirming
    // This is safe because the event has been persisted to the log
    editorState.setPlacementMode(false);

    console.log(`Meta block confirmed at (${metaBlock.position.x}, ${metaBlock.position.y}, ${metaBlock.position.z})`);
  }
}

export const confirmMetaBlockCommand = ConfirmMetaBlockCommand.getInstance();

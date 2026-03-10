import { eventLog } from '../core/EventLog';
import { modelProjection } from '../projections/ModelProjection';

/**
 * ConfirmMetaBlockCommand - Finalize meta block placement
 *
 * Appends model:metaBlockConfirmed event to EventLog
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
    const metaBlock = await modelProjection.getMetaBlock();
    if (!metaBlock) {
      console.error('ConfirmMetaBlockCommand: No meta block to confirm');
      return;
    }

    if (metaBlock.isConfirmed) {
      console.log('ConfirmMetaBlockCommand: Meta block already confirmed');
      return;
    }

    // Append to EventLog
    await eventLog.append('model:metaBlockConfirmed', {});

    console.log(`Meta block confirmed at (${metaBlock.position.x}, ${metaBlock.position.y}, ${metaBlock.position.z})`);
  }
}

export const confirmMetaBlockCommand = ConfirmMetaBlockCommand.getInstance();

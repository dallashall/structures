import { eventLog } from '../core/EventLog';
import type { Vector3D } from '../types';

/**
 * SetMetaBlockCommand - Place or move the meta block
 *
 * Appends model:metaBlockPlaced event to EventLog
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
    // Append to EventLog
    await eventLog.append('model:metaBlockPlaced', {
      position,
    });

    console.log(`Meta block placed at (${position.x}, ${position.y}, ${position.z})`);
  }
}

export const setMetaBlockCommand = SetMetaBlockCommand.getInstance();

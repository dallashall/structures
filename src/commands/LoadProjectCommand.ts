import { eventLog } from '../core/EventLog';
import type { Model, Metadata } from '../types';

/**
 * LoadProjectCommand - Loads a project from storage into event log
 *
 * Takes serialized model and metadata and reconstructs the event history.
 */
class LoadProjectCommand {
  private static instance: LoadProjectCommand;

  private constructor() {}

  static getInstance(): LoadProjectCommand {
    if (!LoadProjectCommand.instance) {
      LoadProjectCommand.instance = new LoadProjectCommand();
    }
    return LoadProjectCommand.instance;
  }

  async execute(model: Model, metadata: Metadata): Promise<void> {
    // Clear existing events
    await eventLog.clear();

    // 1. Create metadata:created event
    await eventLog.append('metadata:created', {
      id: metadata.id,
      name: metadata.name,
    });

    // 2. Create model:initialized event
    await eventLog.append('model:initialized', {
      dimensions: model.dimensions,
    });

    // 3. Create metablock:placed event if needed
    if (model.metaBlock.position.x !== 0 || model.metaBlock.position.y !== 0 || model.metaBlock.position.z !== 0) {
      await eventLog.append('model:metaBlockPlaced', {
        position: model.metaBlock.position,
      });
    }

    // 4. Create metablock:confirmed event if needed
    if (model.metaBlock.isConfirmed) {
      await eventLog.append('model:metaBlockConfirmed', {});
    }

    // 5. Create block:placed events for all blocks
    const allBlocks = model.blocks.toArray();
    for (const blockData of allBlocks) {
      await eventLog.append('model:blockPlaced', {
        position: blockData.position,
        blockType: blockData.blockType,
      });
    }

    console.log(`Loaded project: ${metadata.name} (${metadata.id})`);
    console.log(`  - Blocks: ${allBlocks.length}`);
  }
}

export const loadProjectCommand = LoadProjectCommand.getInstance();

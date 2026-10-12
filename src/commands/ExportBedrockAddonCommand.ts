import { blockRegistry } from '../core/BlockRegistry';
import { editorState } from '../core/EditorState';
import { eventLog } from '../core/EventLog';
import { shapeCatalog } from '../core/shapes/ShapeCatalog';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import type { BlockData } from '../types';
import type { AnimationMode, ItemIcon } from '../utils/bedrockAddon';
import type { BedrockBlockTable } from '../utils/bedrockBlocks';
import { toAddonNames, toMcaddon } from '../utils/bedrockAddon';
import { toBedrockStructure } from '../utils/bedrockExport';
import { saveBinaryFile } from '../utils/fileAccess';
import { toBlockVersion, toMcstructure } from '../utils/mcstructure';

const TABLE_URL = '/data/bedrock-blocks.json';
const MCADDON_TYPE = { description: 'Minecraft add-on', mimeType: 'application/zip', extension: '.mcaddon' };

export interface BedrockExportOptions {
  itemName: string;
  icon: ItemIcon;
  animationMode: AnimationMode;
  animationSeconds: number;
}

export interface SkippedBlock {
  blockId: string;
  name: string;
  count: number;
}

export interface BedrockExportResult {
  isSaved: boolean;
  fileName: string;
  itemId: string;
  skipped: SkippedBlock[];
}

/**
 * ExportBedrockAddonCommand - Saves the open project as a Bedrock .mcaddon
 *
 * Reads: ModelProjection (blocks, meta block, dimensions), MetadataProjection (name),
 * BlockRegistry (real Minecraft IDs), and public/data/bedrock-blocks.json on first use.
 * Appends nothing. Stair corners are resolved from neighbors first, the same way the editor draws them.
 */
class ExportBedrockAddonCommand {
  private static instance: ExportBedrockAddonCommand;
  private table: Promise<BedrockBlockTable> | null = null;

  private constructor() {}

  static getInstance(): ExportBedrockAddonCommand {
    if (!ExportBedrockAddonCommand.instance) {
      ExportBedrockAddonCommand.instance = new ExportBedrockAddonCommand();
    }
    return ExportBedrockAddonCommand.instance;
  }

  private loadTable(): Promise<BedrockBlockTable> {
    const fetchTable = async (): Promise<BedrockBlockTable> => {
      const response = await fetch(TABLE_URL);
      if (!response.ok) throw new Error(`The Bedrock block table did not load (${response.status}).`);
      return (await response.json()) as BedrockBlockTable;
    };
    const forgetFailure = (error: unknown): never => {
      this.table = null;
      throw error;
    };
    this.table ??= fetchTable().catch(forgetFailure);
    return this.table;
  }

  async execute(options: BedrockExportOptions): Promise<BedrockExportResult> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) throw new Error('No project is open.');

    await eventLog.settled();
    const [table, model, metadata] = await Promise.all([
      this.loadTable(),
      modelProjection.getModel(),
      metadataProjection.getMetadata(),
    ]);
    const projectName = metadata?.name ?? 'Build';

    const resolve = (block: BlockData): BlockData => shapeCatalog.resolveBlockState(block.position, model.blocks) ?? block;
    const toJavaId = (blockId: string): string => blockRegistry.getBlock(blockId)?.javaId ?? blockId;
    const structure = toBedrockStructure(
      model.dimensions,
      model.metaBlock,
      model.blocks.toArray().map(resolve),
      table,
      toJavaId,
    );

    const [major, minor, patch] = table.bedrockVersion;
    const addon = await toMcaddon({
      projectId,
      projectName,
      itemName: options.itemName.trim() || `${projectName} Wand`,
      icon: options.icon,
      animationMode: options.animationMode,
      animationSeconds: options.animationSeconds,
      structure: toMcstructure(structure.size, structure.cells, toBlockVersion(major, minor, patch)),
      placements: structure.placements,
      exportedAt: Date.now(),
    });

    const names = toAddonNames(projectName);
    const fileName = `${names.slug}.mcaddon`;
    const isSaved = await saveBinaryFile(fileName, addon, MCADDON_TYPE);

    const toSkippedBlock = ([blockId, count]: [string, number]): SkippedBlock => ({
      blockId,
      name: blockRegistry.getBlock(blockId)?.name ?? blockId,
      count,
    });
    return { isSaved, fileName, itemId: names.itemId, skipped: [...structure.skipped].map(toSkippedBlock) };
  }
}

export const exportBedrockAddonCommand = ExportBedrockAddonCommand.getInstance();

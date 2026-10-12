import { blockRegistry } from '../core/BlockRegistry';
import { textureResolver } from '../core/TextureResolver';
import { editorState } from '../core/EditorState';
import { eventLog } from '../core/EventLog';
import { shapeCatalog } from '../core/shapes/ShapeCatalog';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import type { BlockData } from '../types';
import type { ItemIcon } from '../utils/bedrockAddon';
import type { BuildSequence } from '../utils/bedrockAddonScript';
import type { Rgb } from '../utils/bedrockAnimation';
import type { BedrockBlockTable } from '../utils/bedrockBlocks';
import { toAddonNames, toMcaddon } from '../utils/bedrockAddon';
import { toAnimatedBuild } from '../utils/bedrockAnimation';
import { toBedrockStructure } from '../utils/bedrockExport';
import { toGlowTint } from '../utils/buildSequence';
import { cssColorToRgb } from '../utils/cssColor';
import { saveBinaryFile } from '../utils/fileAccess';
import { toBlockVersion, toMcstructure } from '../utils/mcstructure';

const TABLE_URL = '/data/bedrock-blocks.json';
const PACK_ICON_URL = '/logo-256.png';
const MCADDON_TYPE = { description: 'Minecraft add-on', mimeType: 'application/zip', extension: '.mcaddon' };

export interface BedrockExportOptions {
  itemName: string;
  icon: ItemIcon;
  sequence: BuildSequence;
  seconds: number;
  // 0 means unlimited
  uses: number;
}

// The glow particle takes 0-1 channels. Faces with no texture fall back to the catalog color.
const FRONT_FACE = 0;
const toRgb = (blockId: string): Rgb | null => {
  const css = textureResolver.getFaceColor(blockId, FRONT_FACE) ?? blockRegistry.getBlock(blockId)?.color ?? null;
  const rgb = css ? cssColorToRgb(css) : null;
  return rgb ? toGlowTint(rgb) : null;
};

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
async function loadPackIcon(): Promise<Uint8Array> {
  const response = await fetch(PACK_ICON_URL);
  if (!response.ok) throw new Error(`The pack icon did not load (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

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
    const [table, model, metadata, packIcon] = await Promise.all([
      this.loadTable(),
      modelProjection.getModel(),
      metadataProjection.getMetadata(),
      loadPackIcon(),
    ]);
    const projectName = metadata?.name ?? 'Build';

    const resolve = (block: BlockData): BlockData => shapeCatalog.resolveBlockState(block.position, model.blocks) ?? block;
    const toJavaId = (blockId: string): string => blockRegistry.getBlock(blockId)?.javaId ?? blockId;
    const blocks = model.blocks.toArray().map(resolve);
    const structure = toBedrockStructure(model.dimensions, model.metaBlock, blocks, table, toJavaId);
    const build = toAnimatedBuild(model.metaBlock, blocks, table, toJavaId, toRgb);

    const [major, minor, patch] = table.bedrockVersion;
    const addon = await toMcaddon({
      projectId,
      projectName,
      itemName: options.itemName.trim() || `${projectName} Wand`,
      icon: options.icon,
      sequence: options.sequence,
      seconds: options.seconds,
      uses: options.uses,
      metaFacing: model.metaBlock.direction,
      build,
      structure: toMcstructure(structure.size, structure.cells, toBlockVersion(major, minor, patch)),
      placements: structure.placements,
      exportedAt: Date.now(),
      packIcon,
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

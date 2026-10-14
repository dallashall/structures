/**
 * Options, results, and project reads shared by the Bedrock add-on and Java data pack exports
 *
 * Reads: ModelProjection (blocks, meta block, dimensions), MetadataProjection (name), BlockRegistry (real
 * Minecraft IDs and colors), TextureResolver (face colors), and public/data/bedrock-blocks.json on first use.
 * Stair corners are resolved from neighbors first, the same way the editor draws them.
 */

import { blockRegistry } from '../core/BlockRegistry';
import { textureResolver } from '../core/TextureResolver';
import { editorState } from '../core/EditorState';
import { eventLog } from '../core/EventLog';
import { shapeCatalog } from '../core/shapes/ShapeCatalog';
import { metadataProjection } from '../projections/MetadataProjection';
import { modelProjection } from '../projections/ModelProjection';
import type { Model } from '../reducers/modelReducer';
import type { BlockData } from '../types';
import type { ItemIcon } from '../utils/bedrockAddon';
import type { BuildSequence } from '../utils/bedrockAddonScript';
import type { Rgb } from '../utils/animatedBuild';
import type { BedrockBlockTable } from '../utils/bedrockBlocks';
import type { CameraMode } from '../utils/cameraPath';
import type { WandRecipe } from '../utils/javaDatapack';
import { toGlowTint } from '../utils/buildSequence';
import { cssColorToRgb } from '../utils/cssColor';

const TABLE_URL = '/data/bedrock-blocks.json';

export type ExportEdition = 'bedrock' | 'java';

export interface ExportOptions {
  edition: ExportEdition;
  // Empty means the project name
  addonName: string;
  // Empty means "<add-on name> Wand"
  itemName: string;
  icon: ItemIcon;
  sequence: BuildSequence;
  seconds: number;
  // 0 means unlimited
  uses: number;
  // Bedrock only. Java has no camera control.
  camera: CameraMode;
  // Java only. The give function works with or without a recipe.
  recipe: WandRecipe;
}

export interface SkippedBlock {
  blockId: string;
  name: string;
  count: number;
}

export interface ExportResult {
  isSaved: boolean;
  fileName: string;
  // What the player types in game to get the wand
  command: string;
  skipped: SkippedBlock[];
}

export interface ExportProject {
  projectId: string;
  // The add-on or pack name, with the project name filled in when the option is empty
  name: string;
  model: Model;
  blocks: BlockData[];
  table: BedrockBlockTable;
}

let table: Promise<BedrockBlockTable> | null = null;

function loadBlockTable(): Promise<BedrockBlockTable> {
  const fetchTable = async (): Promise<BedrockBlockTable> => {
    const response = await fetch(TABLE_URL);
    if (!response.ok) throw new Error(`The Bedrock block table did not load (${response.status}).`);
    return (await response.json()) as BedrockBlockTable;
  };
  const forgetFailure = (error: unknown): never => {
    table = null;
    throw error;
  };
  table ??= fetchTable().catch(forgetFailure);
  return table;
}

/**
 * The open project's settled model, its resolved blocks, and the block table
 */
export async function loadExportProject(nameOption: string): Promise<ExportProject> {
  const projectId = editorState.getCurrentProjectId();
  if (!projectId) throw new Error('No project is open.');

  await eventLog.settled();
  const [blockTable, model, metadata] = await Promise.all([
    loadBlockTable(),
    modelProjection.getModel(),
    metadataProjection.getMetadata(),
  ]);
  const resolve = (block: BlockData): BlockData => shapeCatalog.resolveBlockState(block.position, model.blocks) ?? block;
  return {
    projectId,
    name: nameOption.trim() || metadata?.name || 'Build',
    model,
    blocks: model.blocks.toArray().map(resolve),
    table: blockTable,
  };
}

export const toJavaId = (blockId: string): string => blockRegistry.getBlock(blockId)?.javaId ?? blockId;

// The glow particle takes 0-1 channels. Faces with no texture fall back to the catalog color.
const FRONT_FACE = 0;
export const toGlowRgb = (blockId: string): Rgb | null => {
  const css = textureResolver.getFaceColor(blockId, FRONT_FACE) ?? blockRegistry.getBlock(blockId)?.color ?? null;
  const rgb = css ? cssColorToRgb(css) : null;
  return rgb ? toGlowTint(rgb) : null;
};

export const toSkippedBlocks = (skipped: Map<string, number>): SkippedBlock[] => {
  const toSkippedBlock = ([blockId, count]: [string, number]): SkippedBlock => ({
    blockId,
    name: blockRegistry.getBlock(blockId)?.name ?? blockId,
    count,
  });
  return [...skipped].map(toSkippedBlock);
};

import type { ExportOptions, ExportResult } from './exportParts';
import type { BedrockTableEntry } from '../utils/bedrockBlocks';
import { loadExportProject, toGlowRgb, toJavaId, toSkippedBlocks } from './exportParts';
import { toAddonNames, toDefaultItemName, toMcaddon, toSnowballCount } from '../utils/bedrockAddon';
import { toAnimatedBuild } from '../utils/animatedBuild';
import { findBedrockBlock, toBedrockStructure } from '../utils/bedrockExport';
import { saveBinaryFile } from '../utils/fileAccess';
import { toBlockVersion, toMcstructure } from '../utils/mcstructure';

const PACK_ICON_URL = '/logo-256.png';
const MCADDON_TYPE = { description: 'Minecraft add-on', mimeType: 'application/zip', extension: '.mcaddon' };

async function loadPackIcon(): Promise<Uint8Array> {
  const response = await fetch(PACK_ICON_URL);
  if (!response.ok) throw new Error(`The pack icon did not load (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * ExportBedrockAddonCommand - Saves the open project as a Bedrock .mcaddon
 *
 * Reads the project through loadExportProject. Appends nothing.
 */
class ExportBedrockAddonCommand {
  private static instance: ExportBedrockAddonCommand;

  private constructor() {}

  static getInstance(): ExportBedrockAddonCommand {
    if (!ExportBedrockAddonCommand.instance) {
      ExportBedrockAddonCommand.instance = new ExportBedrockAddonCommand();
    }
    return ExportBedrockAddonCommand.instance;
  }

  async execute(options: ExportOptions): Promise<ExportResult> {
    const [{ projectId, name, model, blocks, table }, packIcon] = await Promise.all([
      loadExportProject(options.addonName),
      loadPackIcon(),
    ]);
    const structure = toBedrockStructure(model.dimensions, model.metaBlock, blocks, table, toJavaId);
    const findEntry = (blockId: string, properties: Record<string, string>): BedrockTableEntry | null =>
      findBedrockBlock(table, toJavaId(blockId), properties);
    const build = toAnimatedBuild(model.metaBlock, blocks, findEntry, toGlowRgb);

    const [major, minor, patch] = table.bedrockVersion;
    const addon = await toMcaddon({
      projectId,
      projectName: name,
      itemName: options.itemName.trim() || toDefaultItemName(name, options.activator),
      icon: options.icon,
      activator: options.activator,
      sequence: options.sequence,
      seconds: options.seconds,
      uses: options.uses,
      metaFacing: model.metaBlock.direction,
      camera: options.sequence === 'instant' || options.sequence === 'pop' ? 'none' : options.camera,
      build,
      structure: toMcstructure(structure.size, structure.cells, toBlockVersion(major, minor, patch)),
      placements: structure.placements,
      exportedAt: Date.now(),
      packIcon,
    });

    const names = toAddonNames(name, projectId);
    const fileName = `${names.slug}.mcaddon`;
    const isSaved = await saveBinaryFile(fileName, addon, MCADDON_TYPE);
    const count = options.activator === 'snowball' ? ` ${toSnowballCount(options.uses)}` : '';
    return { isSaved, fileName, command: `/give @s ${names.itemId}${count}`, skipped: toSkippedBlocks(structure.skipped) };
  }
}

export const exportBedrockAddonCommand = ExportBedrockAddonCommand.getInstance();

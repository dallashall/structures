import type { ExportOptions, ExportResult } from './exportParts';
import { loadExportProject, toGlowRgb, toJavaId, toSkippedBlocks } from './exportParts';
import { toAddonNames } from '../utils/bedrockAddon';
import { toAnimatedBuild } from '../utils/animatedBuild';
import { saveBinaryFile } from '../utils/fileAccess';
import { findJavaBlockState, toDatapackZip } from '../utils/javaDatapack';

const ZIP_TYPE = { description: 'Minecraft data pack', mimeType: 'application/zip', extension: '.zip' };

/**
 * ExportJavaDatapackCommand - Saves the open project as a Java data pack .zip
 *
 * Reads the project through loadExportProject. Appends nothing. The block table's keys are Java states, so it
 * also fills the properties the app does not track.
 */
class ExportJavaDatapackCommand {
  private static instance: ExportJavaDatapackCommand;

  private constructor() {}

  static getInstance(): ExportJavaDatapackCommand {
    if (!ExportJavaDatapackCommand.instance) {
      ExportJavaDatapackCommand.instance = new ExportJavaDatapackCommand();
    }
    return ExportJavaDatapackCommand.instance;
  }

  async execute(options: ExportOptions): Promise<ExportResult> {
    const { projectId, name, model, blocks, table } = await loadExportProject(options.addonName);
    const findEntry = (blockId: string, properties: Record<string, string>): string | null =>
      findJavaBlockState(table, toJavaId(blockId), properties);
    const build = toAnimatedBuild(model.metaBlock, blocks, findEntry, toGlowRgb);

    const pack = toDatapackZip({
      projectId,
      packName: name,
      itemName: options.itemName.trim() || `${name} Wand`,
      icon: options.icon,
      sequence: options.sequence,
      seconds: options.seconds,
      uses: options.uses,
      metaFacing: model.metaBlock.direction,
      build,
    });

    const names = toAddonNames(name, projectId);
    const fileName = `${names.slug}.zip`;
    const isSaved = await saveBinaryFile(fileName, pack, ZIP_TYPE);
    return { isSaved, fileName, command: `/function ${names.namespace}:give`, skipped: toSkippedBlocks(build.skipped) };
  }
}

export const exportJavaDatapackCommand = ExportJavaDatapackCommand.getInstance();

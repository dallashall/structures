#!/usr/bin/env npx tsx

/**
 * Writes resource-packs/<pack>/pack-manifest.json, which maps logical texture names to files in an
 * unpacked resource pack. scripts/buildTextureAtlas.ts reads it.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PackManifest, PackMetadata } from '../src/types/canonical';

const isPng = (file: string): boolean => file.endsWith('.png');

interface GenerateOptions {
  pack: string;
  source: string;
  output?: string;
  verbose?: boolean;
}

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const options: Partial<GenerateOptions> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pack':
        options.pack = args[++i];
        break;
      case '--source':
        options.source = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/generatePackManifest.ts --pack <packId> --source <pack-directory> [options]

Options:
  --pack <id>       Pack identifier, e.g. "squareful" (required)
  --source <dir>    Path to resource pack directory (required)
  --output <file>   Output path for manifest (default: resource-packs/<packId>/pack-manifest.json)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message
`);
        process.exit(0);
    }
  }

  if (!options.pack) {
    console.error('Error: --pack argument is required');
    process.exit(1);
  }

  if (!options.source) {
    console.error('Error: --source argument is required');
    process.exit(1);
  }

  if (!options.output) {
    options.output = `resource-packs/${options.pack}/pack-manifest.json`;
  }

  return options as GenerateOptions;
}

function parsePackMetadata(packDir: string): PackMetadata | null {
  const metadataPath = path.join(packDir, 'pack.mcmeta');

  if (!fs.existsSync(metadataPath)) {
    console.warn('Warning: pack.mcmeta not found');
    return null;
  }

  try {
    // Some packs save pack.mcmeta with a UTF-8 BOM, which JSON.parse rejects
    let content = fs.readFileSync(metadataPath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return JSON.parse(content) as PackMetadata;
  } catch (error) {
    console.error('Error parsing pack.mcmeta:', error);
    return null;
  }
}

function scanTextures(texturesDir: string, verbose: boolean): Record<string, string> {
  const textureMappings: Record<string, string> = {};

  if (!fs.existsSync(texturesDir)) {
    console.error(`Error: Textures directory not found: ${texturesDir}`);
    return textureMappings;
  }

  const files = fs.readdirSync(texturesDir);
  const textureFiles = files.filter(isPng);

  if (verbose) {
    console.log(`Scanning ${textureFiles.length} texture files...`);
  }

  for (const file of textureFiles) {
    const logicalName = file.replace('.png', '');
    textureMappings[logicalName] = file;
  }

  return textureMappings;
}

/**
 * Groups numbered textures with their base: oak_planks, oak_planks2, oak_planks3.
 * A numbered name without an unnumbered base is not a variant.
 */
function detectVariants(textureMappings: Record<string, string>): Record<string, string[]> {
  const variants: Record<string, string[]> = {};
  const processed = new Set<string>();

  for (const logicalName of Object.keys(textureMappings)) {
    if (processed.has(logicalName)) {
      continue;
    }

    const match = logicalName.match(/^(.+?)(\d+)$/);

    if (match) {
      const baseName = match[1];

      if (textureMappings[baseName]) {
        const variantList: string[] = [baseName];
        let i = 2;
        while (textureMappings[`${baseName}${i}`]) {
          variantList.push(`${baseName}${i}`);
          processed.add(`${baseName}${i}`);
          i++;
        }

        if (variantList.length > 1) {
          variants[baseName] = variantList;
          processed.add(baseName);
        }
      }
    }
  }

  return variants;
}

function extractPackName(packDir: string): string {
  const dirName = path.basename(packDir);

  // The leading Latin name: "Squareful方纹v26.0.6" -> "Squareful"
  const match = dirName.match(/^([A-Za-z][A-Za-z0-9\s]*)/);
  if (match) {
    return match[1].trim();
  }

  return dirName;
}

async function detectTextureResolution(texturesDir: string): Promise<number> {
  try {
    const sampleFiles = ['stone.png', 'dirt.png', 'oak_planks.png', 'cobblestone.png'];

    for (const sampleFile of sampleFiles) {
      const samplePath = path.join(texturesDir, sampleFile);
      if (fs.existsSync(samplePath)) {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(samplePath).metadata();
        if (metadata.width) {
          return metadata.width;
        }
      }
    }

    const files = fs.readdirSync(texturesDir);
    const firstPng = files.find(isPng);
    if (firstPng) {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(path.join(texturesDir, firstPng)).metadata();
      if (metadata.width) {
        return metadata.width;
      }
    }
  } catch (error) {
    console.warn('Could not detect texture resolution:', error);
  }

  return 16;
}

async function generatePackManifest(options: GenerateOptions): Promise<void> {
  console.log(`Generating pack manifest for: ${options.pack}`);

  const packDir = path.resolve(options.source);

  if (!fs.existsSync(packDir)) {
    console.error(`Error: Pack directory not found: ${packDir}`);
    process.exit(1);
  }

  const metadata = parsePackMetadata(packDir);
  let packFormat = 0;
  let supportedFormats: [number, number] | undefined;

  if (metadata) {
    packFormat = metadata.pack.pack_format;
    if (metadata.pack.supported_formats) {
      supportedFormats = metadata.pack.supported_formats;
    }
    console.log(`Pack format: ${packFormat}`);
  }

  const packName = extractPackName(packDir);
  const version = packDir.match(/v?(\d+\.\d+\.?\d*)/)?.[1] || '1.0.0';

  const assetsDir = path.join(packDir, 'assets', 'minecraft');
  const texturesDir = path.join(assetsDir, 'textures', 'block');
  const textureBasePath = path.relative(packDir, texturesDir);

  console.log(`Textures directory: ${texturesDir}`);

  const textureMappings = scanTextures(texturesDir, options.verbose || false);
  console.log(`Found ${Object.keys(textureMappings).length} textures`);

  const variants = detectVariants(textureMappings);
  console.log(`Found ${Object.keys(variants).length} variant groups`);

  if (options.verbose) {
    for (const [baseName, variantList] of Object.entries(variants)) {
      console.log(`  ${baseName}: ${variantList.join(', ')}`);
    }
  }

  const resolution = await detectTextureResolution(texturesDir);
  console.log(`Texture resolution: ${resolution}x${resolution}`);

  const fallbackTexture = textureMappings['stone'] || textureMappings['cobblestone'] || 'missing.png';

  const manifest: PackManifest = {
    packId: options.pack,
    packName,
    version,
    resolution,
    textureBasePath,
    textureMappings,
    variants: Object.keys(variants).length > 0 ? variants : undefined,
    fallbacks: {
      missing: fallbackTexture,
    },
    packFormat,
    supportedFormats,
  };

  const outputPath = path.resolve(options.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`\nPack manifest written to: ${outputPath}`);
}

const options = parseArgs();
const exitWithError = (error: unknown): void => {
  console.error('Fatal error:', error);
  process.exit(1);
};
generatePackManifest(options).catch(exitWithError);

export { generatePackManifest };

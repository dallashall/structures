#!/usr/bin/env npx tsx

/**
 * Pack Manifest Generator
 *
 * Auto-generates pack manifest from Minecraft resource pack structure.
 * Scans textures directory and builds texture mappings for atlas generation.
 *
 * Usage:
 *   npx tsx scripts/generatePackManifest.ts --pack squareful --source "Squareful方纹v26.0.6/"
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PackManifest, PackMetadata } from '../src/types/canonical';

interface GenerateOptions {
  pack: string;
  source: string;
  output?: string;
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
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

/**
 * Read and parse pack.mcmeta
 */
function parsePackMetadata(packDir: string): PackMetadata | null {
  const metadataPath = path.join(packDir, 'pack.mcmeta');

  if (!fs.existsSync(metadataPath)) {
    console.warn('Warning: pack.mcmeta not found');
    return null;
  }

  try {
    // Read file and strip BOM if present
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

/**
 * Scan textures directory and build texture mappings
 */
function scanTextures(texturesDir: string, verbose: boolean): Record<string, string> {
  const textureMappings: Record<string, string> = {};

  if (!fs.existsSync(texturesDir)) {
    console.error(`Error: Textures directory not found: ${texturesDir}`);
    return textureMappings;
  }

  const files = fs.readdirSync(texturesDir);
  const textureFiles = files.filter(file => file.endsWith('.png'));

  if (verbose) {
    console.log(`Scanning ${textureFiles.length} texture files...`);
  }

  for (const file of textureFiles) {
    // Remove .png extension to get logical name
    const logicalName = file.replace('.png', '');
    textureMappings[logicalName] = file;
  }

  return textureMappings;
}

/**
 * Detect texture variants (e.g., oak_planks, oak_planks2, oak_planks3)
 */
function detectVariants(textureMappings: Record<string, string>): Record<string, string[]> {
  const variants: Record<string, string[]> = {};
  const processed = new Set<string>();

  for (const logicalName of Object.keys(textureMappings)) {
    // Skip if already processed
    if (processed.has(logicalName)) {
      continue;
    }

    // Check if this is a base name (no number suffix)
    const match = logicalName.match(/^(.+?)(\d+)$/);

    if (match) {
      // This is a numbered variant (e.g., oak_planks2)
      const baseName = match[1];

      // Check if base exists
      if (textureMappings[baseName]) {
        // Find all variants
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

/**
 * Extract pack name from directory
 */
function extractPackName(packDir: string): string {
  const dirName = path.basename(packDir);

  // Try to extract name from common patterns
  // Example: "Squareful方纹v26.0.6" -> "Squareful"
  const match = dirName.match(/^([A-Za-z][A-Za-z0-9\s]*)/);
  if (match) {
    return match[1].trim();
  }

  return dirName;
}

/**
 * Determine texture resolution by reading a sample texture
 */
async function detectTextureResolution(texturesDir: string): Promise<number> {
  try {
    // Try to find a common texture file
    const sampleFiles = ['stone.png', 'dirt.png', 'oak_planks.png', 'cobblestone.png'];

    for (const sampleFile of sampleFiles) {
      const samplePath = path.join(texturesDir, sampleFile);
      if (fs.existsSync(samplePath)) {
        // Use sharp to read image dimensions
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(samplePath).metadata();
        if (metadata.width) {
          return metadata.width;
        }
      }
    }

    // If no sample found, try the first PNG file
    const files = fs.readdirSync(texturesDir);
    const firstPng = files.find(f => f.endsWith('.png'));
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

  // Default to 16x16
  return 16;
}

/**
 * Main generation function
 */
async function generatePackManifest(options: GenerateOptions): Promise<void> {
  console.log(`Generating pack manifest for: ${options.pack}`);

  const packDir = path.resolve(options.source);

  if (!fs.existsSync(packDir)) {
    console.error(`Error: Pack directory not found: ${packDir}`);
    process.exit(1);
  }

  // Parse pack metadata
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

  // Extract pack info
  const packName = extractPackName(packDir);
  const version = packDir.match(/v?(\d+\.\d+\.?\d*)/)?.[1] || '1.0.0';

  // Locate directories
  const assetsDir = path.join(packDir, 'assets', 'minecraft');
  const texturesDir = path.join(assetsDir, 'textures', 'block');
  const textureBasePath = path.relative(packDir, texturesDir);

  console.log(`Textures directory: ${texturesDir}`);

  // Scan textures
  const textureMappings = scanTextures(texturesDir, options.verbose || false);
  console.log(`Found ${Object.keys(textureMappings).length} textures`);

  // Detect variants
  const variants = detectVariants(textureMappings);
  console.log(`Found ${Object.keys(variants).length} variant groups`);

  if (options.verbose) {
    for (const [baseName, variantList] of Object.entries(variants)) {
      console.log(`  ${baseName}: ${variantList.join(', ')}`);
    }
  }

  // Detect texture resolution
  const resolution = await detectTextureResolution(texturesDir);
  console.log(`Texture resolution: ${resolution}x${resolution}`);

  // Choose fallback texture
  const fallbackTexture = textureMappings['stone'] || textureMappings['cobblestone'] || 'missing.png';

  // Build manifest
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

  // Write output
  const outputPath = path.resolve(options.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`\nPack manifest written to: ${outputPath}`);
}

// Run if called directly
const options = parseArgs();
generatePackManifest(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { generatePackManifest };

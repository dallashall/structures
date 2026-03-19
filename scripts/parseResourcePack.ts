#!/usr/bin/env tsx

/**
 * Resource Pack Parser
 *
 * Parses Minecraft resource pack structure (blockstates, models, textures)
 * and generates canonical-blocks.json with comprehensive block coverage.
 *
 * Usage:
 *   tsx scripts/parseResourcePack.ts --source "Squareful方纹v26.0.6/" --output data/canonical-blocks.json
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  CanonicalBlock,
  CanonicalBlocks,
  BlockstateDefinition,
  BlockstateVariant,
  ModelDefinition,
  PackMetadata,
  BlockTextures,
} from '../src/types/canonical';

interface ParseOptions {
  source: string;
  output: string;
  verbose?: boolean;
}

interface ParsedBlock {
  blockId: string;
  displayName: string;
  category: string;
  textures: BlockTextures;
  variants: string[];
  hasBlockState: boolean;
  defaultState?: Record<string, string>;
  parentModel?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ParseOptions {
  const args = process.argv.slice(2);
  const options: ParseOptions = {
    source: '',
    output: 'data/canonical-blocks.json',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
Usage: tsx scripts/parseResourcePack.ts --source <pack-directory> [options]

Options:
  --source <dir>    Path to resource pack directory (required)
  --output <file>   Output path for canonical-blocks.json (default: data/canonical-blocks.json)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message
`);
        process.exit(0);
    }
  }

  if (!options.source) {
    console.error('Error: --source argument is required');
    process.exit(1);
  }

  return options;
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
    const content = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content) as PackMetadata;
  } catch (error) {
    console.error('Error parsing pack.mcmeta:', error);
    return null;
  }
}

/**
 * Read blockstate JSON file
 */
function readBlockstate(blockstatesDir: string, blockName: string): BlockstateDefinition | null {
  const blockstatePath = path.join(blockstatesDir, `${blockName}.json`);

  if (!fs.existsSync(blockstatePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(blockstatePath, 'utf-8');
    return JSON.parse(content) as BlockstateDefinition;
  } catch (error) {
    console.error(`Error parsing blockstate ${blockName}:`, error);
    return null;
  }
}

/**
 * Read model JSON file with parent resolution
 */
function readModel(
  modelsDir: string,
  modelName: string,
  cache: Map<string, ModelDefinition | null> = new Map()
): ModelDefinition | null {
  // Check cache first
  if (cache.has(modelName)) {
    return cache.get(modelName)!;
  }

  // Handle block/ prefix
  const cleanModelName = modelName.replace(/^(minecraft:)?block\//, '');
  const modelPath = path.join(modelsDir, `${cleanModelName}.json`);

  if (!fs.existsSync(modelPath)) {
    // Model doesn't exist in pack - assume it's a vanilla model
    cache.set(modelName, null);
    return null;
  }

  try {
    const content = fs.readFileSync(modelPath, 'utf-8');
    const model = JSON.parse(content) as ModelDefinition;

    // If model has a parent, resolve and merge
    if (model.parent) {
      const parentModel = readModel(modelsDir, model.parent, cache);
      if (parentModel) {
        // Merge parent textures with child (child overrides parent)
        model.textures = {
          ...parentModel.textures,
          ...model.textures,
        };
      }
    }

    cache.set(modelName, model);
    return model;
  } catch (error) {
    console.error(`Error parsing model ${modelName}:`, error);
    cache.set(modelName, null);
    return null;
  }
}

/**
 * Extract texture references from model
 */
function extractTexturesFromModel(model: ModelDefinition): BlockTextures {
  const textures: BlockTextures = {};

  if (!model.textures) {
    return textures;
  }

  // Map common texture keys to face names
  const textureMap: Record<string, keyof BlockTextures> = {
    all: 'all',
    top: 'top',
    bottom: 'bottom',
    side: 'side',
    end: 'end',
    front: 'north',
    back: 'south',
    north: 'north',
    south: 'south',
    east: 'east',
    west: 'west',
  };

  for (const [key, value] of Object.entries(model.textures)) {
    const mappedKey = textureMap[key];
    if (mappedKey && typeof value === 'string') {
      // Remove minecraft: or block/ prefix
      let cleanValue = value.replace(/^(minecraft:)?block\//, '');

      // Extract just the filename if there are subdirectories
      // e.g., "planks/oak/oak_planks_0" -> "oak_planks_0"
      const parts = cleanValue.split('/');
      cleanValue = parts[parts.length - 1];

      textures[mappedKey] = cleanValue;
    }
  }

  return textures;
}

/**
 * Get first variant from blockstate
 */
function getFirstVariant(blockstate: BlockstateDefinition): BlockstateVariant | null {
  if (!blockstate.variants) {
    return null;
  }

  // Get first variant key
  const variantKeys = Object.keys(blockstate.variants);
  if (variantKeys.length === 0) {
    return null;
  }

  const firstVariant = blockstate.variants[variantKeys[0]];

  // Handle array of variants (weighted random)
  if (Array.isArray(firstVariant)) {
    return firstVariant[0];
  }

  return firstVariant;
}

/**
 * Extract variant texture names from blockstate
 */
function extractVariants(blockstate: BlockstateDefinition): string[] {
  const variants: string[] = [];

  if (!blockstate.variants) {
    return variants;
  }

  // Look for variants with empty string key (weighted random variants)
  const defaultVariants = blockstate.variants[''];
  if (defaultVariants && Array.isArray(defaultVariants)) {
    for (const variant of defaultVariants) {
      // Extract texture name from model reference
      let modelName = variant.model.replace(/^(minecraft:)?block\//, '');

      // Extract just the filename if there are subdirectories
      // e.g., "planks/oak/oak_planks_0" -> "oak_planks_0"
      const parts = modelName.split('/');
      modelName = parts[parts.length - 1];

      variants.push(modelName);
    }
  }

  return variants;
}

/**
 * Get base block texture for slabs, stairs, walls, etc.
 * e.g., "brick_slab" -> "bricks", "cobblestone_wall" -> "cobblestone"
 */
function getBaseBlockTexture(blockName: string): string {
  // Remove common suffixes
  const suffixes = ['_slab', '_stairs', '_wall', '_fence', '_fence_gate'];

  for (const suffix of suffixes) {
    if (blockName.endsWith(suffix)) {
      let baseName = blockName.replace(suffix, '');

      // Special case: "brick" variants should use "bricks"
      if (baseName === 'brick') {
        return 'bricks';
      }

      // Special case: nether_brick -> nether_bricks
      if (baseName === 'nether_brick') {
        return 'nether_bricks';
      }

      // Special case: stone_brick -> stone_bricks
      if (baseName === 'stone_brick') {
        return 'stone_bricks';
      }

      return baseName;
    }
  }

  // No suffix found, return as-is
  return blockName;
}

/**
 * Get vanilla Minecraft texture mapping for blocks without custom models
 */
function getVanillaTextureMapping(blockName: string): BlockTextures | null {
  const vanillaMappings: Record<string, BlockTextures> = {
    grass_block: {
      top: 'grass_block_top',
      bottom: 'dirt',
      side: 'grass_block_side',
    },
    podzol: {
      top: 'dirt_podzol_top',
      bottom: 'dirt',
      side: 'dirt_podzol_side',
    },
    mycelium: {
      top: 'mycelium_top',
      bottom: 'dirt',
      side: 'mycelium_side',
    },
  };

  return vanillaMappings[blockName] || null;
}

/**
 * Determine block category from name
 */
function categorizeBlock(blockName: string): string {
  if (blockName.includes('stone') || blockName.includes('granite') ||
      blockName.includes('diorite') || blockName.includes('andesite')) {
    return 'stone';
  }
  if (blockName.includes('wood') || blockName.includes('log') ||
      blockName.includes('planks') || blockName.includes('oak') ||
      blockName.includes('birch') || blockName.includes('spruce') ||
      blockName.includes('jungle') || blockName.includes('acacia') ||
      blockName.includes('dark_oak') || blockName.includes('bamboo')) {
    return 'wood';
  }
  if (blockName.includes('glass')) {
    return 'glass';
  }
  if (blockName.includes('leaves')) {
    return 'leaves';
  }
  if (blockName.includes('dirt') || blockName.includes('grass') ||
      blockName.includes('sand') || blockName.includes('gravel')) {
    return 'natural';
  }
  if (blockName.includes('ore') || blockName.includes('diamond') ||
      blockName.includes('gold') || blockName.includes('iron') ||
      blockName.includes('copper') || blockName.includes('emerald')) {
    return 'ore';
  }
  if (blockName.includes('wool') || blockName.includes('concrete') ||
      blockName.includes('terracotta')) {
    return 'colored';
  }

  return 'misc';
}

/**
 * Generate display name from block ID
 */
function generateDisplayName(blockId: string): string {
  const name = blockId.replace('minecraft:', '');
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Assign fallback color based on category
 */
function getFallbackColor(category: string, blockName: string): string {
  const categoryColors: Record<string, string> = {
    stone: '#7f7f7f',
    wood: '#9c7f4e',
    glass: '#c0f4ff',
    leaves: '#4f7f3f',
    natural: '#8b6f47',
    ore: '#8f8f8f',
    colored: '#ffffff',
    misc: '#808080',
  };

  // Specific overrides for common blocks
  if (blockName === 'grass_block') return '#7cbd6b';
  if (blockName === 'dirt') return '#8b6f47';
  if (blockName === 'sand') return '#dcd7a0';
  if (blockName === 'gravel') return '#877b7b';

  return categoryColors[category] || '#808080';
}

/**
 * Detect and add overlay textures to block textures
 * (e.g., grass_block_side_overlay for grass_block sides)
 */
function detectOverlayTextures(
  blockName: string,
  textures: BlockTextures,
  texturesDir: string
): BlockTextures {
  const updatedTextures = { ...textures };

  // Check for side overlay (grass_block uses this)
  if (textures.side) {
    const sideOverlayName = `${textures.side}_overlay`;
    const sideOverlayPath = path.join(texturesDir, `${sideOverlayName}.png`);
    if (fs.existsSync(sideOverlayPath)) {
      updatedTextures.sideOverlay = sideOverlayName;
    }
  }

  // Check for top overlay (if needed in future)
  if (textures.top) {
    const topOverlayName = `${textures.top}_overlay`;
    const topOverlayPath = path.join(texturesDir, `${topOverlayName}.png`);
    if (fs.existsSync(topOverlayPath)) {
      updatedTextures.topOverlay = topOverlayName;
    }
  }

  return updatedTextures;
}

/**
 * Parse a single block
 */
function parseBlock(
  blockName: string,
  blockstatesDir: string,
  modelsDir: string,
  modelCache: Map<string, ModelDefinition | null>,
  verbose: boolean
): ParsedBlock | null {
  const blockId = `minecraft:${blockName}`;

  if (verbose) {
    console.log(`Parsing block: ${blockId}`);
  }

  // Read blockstate
  const blockstate = readBlockstate(blockstatesDir, blockName);

  let textures: BlockTextures = {};
  let variants: string[] = [];
  let hasBlockState = false;
  let defaultState: Record<string, string> | undefined;
  let parentModel: string | undefined;

  if (blockstate) {
    hasBlockState = true;

    // Extract variants
    variants = extractVariants(blockstate);

    // Get first variant to extract model/textures
    const firstVariant = getFirstVariant(blockstate);
    if (firstVariant) {
      const model = readModel(modelsDir, firstVariant.model, modelCache);
      if (model) {
        textures = extractTexturesFromModel(model);
        parentModel = model.parent;
      }
    }

    // Extract default state from variant keys
    if (blockstate.variants) {
      const variantKeys = Object.keys(blockstate.variants);
      for (const key of variantKeys) {
        if (key && key !== '') {
          // Parse variant key like "axis=y" or "facing=north,half=top"
          const parts = key.split(',');
          defaultState = {};
          for (const part of parts) {
            const [prop, value] = part.split('=');
            if (prop && value) {
              defaultState[prop] = value;
            }
          }
          break;
        }
      }
    }
  }

  // If no textures found, try direct model lookup
  if (Object.keys(textures).length === 0) {
    const model = readModel(modelsDir, blockName, modelCache);
    if (model) {
      textures = extractTexturesFromModel(model);
      parentModel = model.parent;
    }
  }

  // If still no textures, check vanilla texture mappings for common blocks
  if (Object.keys(textures).length === 0) {
    const vanillaTextures = getVanillaTextureMapping(blockName);
    if (vanillaTextures) {
      textures = vanillaTextures;
    } else {
      // Check if this is a slab/stair/wall variant
      const baseTexture = getBaseBlockTexture(blockName);
      textures = { all: baseTexture };
    }
  }

  const category = categorizeBlock(blockName);
  const displayName = generateDisplayName(blockId);

  return {
    blockId,
    displayName,
    category,
    textures,
    variants,
    hasBlockState,
    defaultState,
    parentModel,
  };
}

/**
 * Check if texture file exists
 */
function textureExists(texturesDir: string, textureName: string): boolean {
  const texturePath = path.join(texturesDir, `${textureName}.png`);
  return fs.existsSync(texturePath);
}

/**
 * Main parsing function
 */
async function parseResourcePack(options: ParseOptions): Promise<void> {
  console.log(`Parsing resource pack: ${options.source}`);

  const packDir = path.resolve(options.source);

  if (!fs.existsSync(packDir)) {
    console.error(`Error: Pack directory not found: ${packDir}`);
    process.exit(1);
  }

  // Parse pack metadata
  const metadata = parsePackMetadata(packDir);
  if (metadata) {
    console.log(`Pack format: ${metadata.pack.pack_format}`);
  }

  // Locate directories
  const assetsDir = path.join(packDir, 'assets', 'minecraft');
  const blockstatesDir = path.join(assetsDir, 'blockstates');
  const modelsDir = path.join(assetsDir, 'models', 'block');
  const texturesDir = path.join(assetsDir, 'textures', 'block');

  if (!fs.existsSync(blockstatesDir)) {
    console.error(`Error: Blockstates directory not found: ${blockstatesDir}`);
    process.exit(1);
  }

  console.log(`Blockstates directory: ${blockstatesDir}`);
  console.log(`Models directory: ${modelsDir}`);
  console.log(`Textures directory: ${texturesDir}`);

  // Get all blockstate files
  const blockstateFiles = fs.readdirSync(blockstatesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  console.log(`Found ${blockstateFiles.length} blockstate files`);

  // Parse all blocks
  const canonicalBlocks: CanonicalBlocks = {};
  const modelCache = new Map<string, ModelDefinition | null>();
  let successCount = 0;
  let errorCount = 0;

  for (const blockName of blockstateFiles) {
    try {
      const parsedBlock = parseBlock(
        blockName,
        blockstatesDir,
        modelsDir,
        modelCache,
        options.verbose || false
      );

      if (parsedBlock) {
        const category = parsedBlock.category;
        const color = getFallbackColor(category, blockName);
        const isTransparent = category === 'glass' || category === 'leaves';

        // Detect overlay textures (e.g., grass_block_side_overlay)
        const texturesWithOverlays = detectOverlayTextures(
          blockName,
          parsedBlock.textures,
          texturesDir
        );

        canonicalBlocks[parsedBlock.blockId] = {
          displayName: parsedBlock.displayName,
          category: parsedBlock.category,
          color,
          textures: texturesWithOverlays,
          hasBlockState: parsedBlock.hasBlockState,
          defaultState: parsedBlock.defaultState,
          variants: parsedBlock.variants.length > 0 ? parsedBlock.variants : undefined,
          isCube: true, // Assume cube for now
          isTransparent,
          parentModel: parsedBlock.parentModel,
        };

        successCount++;
      }
    } catch (error) {
      console.error(`Error parsing block ${blockName}:`, error);
      errorCount++;
    }
  }

  console.log(`\nParsing complete:`);
  console.log(`  Success: ${successCount} blocks`);
  console.log(`  Errors: ${errorCount} blocks`);

  // Second pass: Create blocks from textures without blockstates
  console.log(`\nScanning for textures without blockstates...`);
  if (fs.existsSync(texturesDir)) {
    const textureFiles = fs.readdirSync(texturesDir)
      .filter(file => file.endsWith('.png'))
      .map(file => file.replace('.png', ''));

    let addedCount = 0;
    for (const textureName of textureFiles) {
      const blockId = `minecraft:${textureName}`;

      // Skip if block already exists
      if (canonicalBlocks[blockId]) {
        continue;
      }

      // Skip pane tops, animation files, and other special textures
      if (textureName.includes('_pane_top') ||
          textureName.includes('.mcmeta') ||
          textureName.includes('_overlay') ||
          textureName.endsWith('x')) {
        continue;
      }

      // Create simple cube block from texture
      const category = categorizeBlock(textureName);
      const color = getFallbackColor(category, textureName);
      const isTransparent = category === 'glass' || category === 'leaves';

      canonicalBlocks[blockId] = {
        displayName: textureName.split('_').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        category,
        color,
        textures: {
          all: textureName,
        },
        hasBlockState: false,
        isCube: true,
        isTransparent,
      };

      addedCount++;
    }

    console.log(`  Added ${addedCount} blocks from textures without blockstates`);
  }

  // Verify some textures exist
  const sampleBlocks = ['stone', 'oak_planks', 'glass', 'dirt'];
  console.log(`\nVerifying sample textures:`);
  for (const blockName of sampleBlocks) {
    const blockId = `minecraft:${blockName}`;
    const block = canonicalBlocks[blockId];
    if (block) {
      const textureLogicalName = block.textures.all || block.textures.side || '';
      const exists = textureExists(texturesDir, textureLogicalName);
      console.log(`  ${blockName}: ${exists ? '✓' : '✗'} (${textureLogicalName})`);
    }
  }

  // Write output
  const outputPath = path.resolve(options.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(canonicalBlocks, null, 2));
  console.log(`\nCanonical blocks written to: ${outputPath}`);
  console.log(`Total blocks: ${Object.keys(canonicalBlocks).length}`);
}

// Run if called directly
const options = parseArgs();
parseResourcePack(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { parseResourcePack };

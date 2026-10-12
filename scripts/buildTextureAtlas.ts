#!/usr/bin/env npx tsx

/**
 * Texture Atlas Builder (Rewritten)
 *
 * Simplified atlas builder that works with canonical blocks and pack manifests.
 * Generates atlas.png and atlas.json from any resource pack.
 *
 * Usage:
 *   npx tsx scripts/buildTextureAtlas.ts --pack squareful
 *   npx tsx scripts/buildTextureAtlas.ts --list
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

import type {
  CanonicalBlocks,
  PackManifest,
  BlockTextures,
} from '../src/types/canonical';

// Texture resolution (Minecraft standard)
const TEXTURE_SIZE = 16;

// Atlas metadata output format
interface AtlasMetadata {
  atlasSize: number;
  textureSize: number;
  textureCount: number;
  textureMap: Record<string, { x: number; y: number; u: number; v: number }>;
  blockFaceUV: Record<string, {
    faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
    faceOrder: string[];
  }>;
  blockFaceUV3D: Record<string, {
    faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
    faceOrder: string[];
  }>;
}

interface BuildOptions {
  pack: string;
  // Unpacked resource pack folder. Defaults to the folder setupTextures.ts extracts into.
  source?: string;
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BuildOptions | null {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    listAvailablePacks();
    return null;
  }

  const options: Partial<BuildOptions> = {
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pack':
        options.pack = args[++i];
        break;
      case '--source':
        options.source = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/buildTextureAtlas.ts --pack <packId> [options]

Options:
  --pack <id>       Pack identifier, e.g. "squareful" (required)
  --source <dir>    Unpacked pack folder (default: .cache/packs/<id>)
  --list            List available packs
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Examples:
  npx tsx scripts/buildTextureAtlas.ts --pack squareful
  npx tsx scripts/buildTextureAtlas.ts --list
`);
        process.exit(0);
    }
  }

  if (!options.pack) {
    console.error('Error: --pack argument is required');
    console.error('Use --list to see available packs');
    process.exit(1);
  }

  return options as BuildOptions;
}

/**
 * List available resource packs
 */
function listAvailablePacks(): void {
  const packsDir = path.join(process.cwd(), 'resource-packs');

  if (!fs.existsSync(packsDir)) {
    console.log('No resource packs found. Directory does not exist: resource-packs/');
    return;
  }

  const entries = fs.readdirSync(packsDir);
  const hasManifest = (entry: string): boolean => {
    const manifestPath = path.join(packsDir, entry, 'pack-manifest.json');
    return fs.existsSync(manifestPath);
  };
  const packs = entries.filter(hasManifest);

  if (packs.length === 0) {
    console.log('No resource packs found with pack-manifest.json');
    return;
  }

  console.log('Available resource packs:');
  for (const pack of packs) {
    try {
      const manifestPath = path.join(packsDir, pack, 'pack-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PackManifest;
      console.log(`  - ${pack} (${manifest.packName} v${manifest.version})`);
    } catch (error) {
      console.log(`  - ${pack} (error reading manifest)`);
    }
  }
}

/**
 * Load canonical blocks from data/canonical-blocks.json
 */
function loadCanonicalBlocks(): CanonicalBlocks {
  const blocksPath = path.join(process.cwd(), 'data', 'canonical-blocks.json');

  if (!fs.existsSync(blocksPath)) {
    console.error('Error: canonical-blocks.json not found');
    console.error('Run: npx tsx scripts/parseResourcePack.ts --source <pack-dir>');
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(blocksPath, 'utf-8')) as CanonicalBlocks;
  } catch (error) {
    console.error('Error loading canonical-blocks.json:', error);
    process.exit(1);
  }
}

/**
 * Load pack manifest
 */
function loadPackManifest(packId: string): PackManifest {
  const manifestPath = path.join(process.cwd(), 'resource-packs', packId, 'pack-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Pack manifest not found: ${manifestPath}`);
    console.error(`Run: npx tsx scripts/generatePackManifest.ts --pack ${packId} --source <pack-dir>`);
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PackManifest;
  } catch (error) {
    console.error('Error loading pack manifest:', error);
    process.exit(1);
  }
}

/**
 * Resolve texture path from logical name
 */
function resolveTexturePath(
  logicalName: string,
  packManifest: PackManifest,
  packSourceDir: string
): string | null {
  const filename = packManifest.textureMappings[logicalName];
  if (!filename) {
    return null;
  }

  const texturePath = path.join(
    packSourceDir,
    packManifest.textureBasePath,
    filename
  );

  if (!fs.existsSync(texturePath)) {
    return null;
  }

  return texturePath;
}

/**
 * Get texture for a block face
 * Returns composite texture name (base+overlay) if overlay exists
 */
function getBlockFaceTexture(
  blockTextures: BlockTextures,
  face: 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom'
): string {
  // Map face to texture key
  const faceMap: Record<typeof face, keyof BlockTextures> = {
    front: 'north',  // Front is north in Minecraft coordinates
    back: 'south',
    right: 'east',
    left: 'west',
    top: 'top',
    bottom: 'bottom',
  };

  const textureKey = faceMap[face];

  // Try specific face, then side, then all
  let textureName = blockTextures[textureKey] || blockTextures.side || blockTextures.all || 'missing';

  // Check if this face uses an overlay texture
  if (face === 'top' && blockTextures.top && blockTextures.topOverlay) {
    textureName = `${blockTextures.top}+${blockTextures.topOverlay}`;
  } else if (
    (face === 'front' || face === 'back' || face === 'right' || face === 'left') &&
    blockTextures.side &&
    blockTextures.sideOverlay &&
    !blockTextures[textureKey] // Only use side overlay if specific face not defined
  ) {
    textureName = `${blockTextures.side}+${blockTextures.sideOverlay}`;
  }

  return textureName;
}

/**
 * Collect all unique textures needed for the atlas
 */
function collectUniqueTextures(
  canonicalBlocks: CanonicalBlocks,
  packManifest: PackManifest
): Set<string> {
  const textureSet = new Set<string>();

  for (const block of Object.values(canonicalBlocks)) {
    // Collect all texture names from this block
    const textures = block.textures;

    for (const [key, textureName] of Object.entries(textures)) {
      // Skip overlay keys - they'll be handled by compositing
      if (key.endsWith('Overlay')) {
        continue;
      }

      if (textureName && packManifest.textureMappings[textureName]) {
        // Check if this texture has an overlay
        let finalTextureName = textureName;

        if (key === 'side' && textures.sideOverlay && packManifest.textureMappings[textures.sideOverlay]) {
          // Create composite texture name
          finalTextureName = `${textureName}+${textures.sideOverlay}`;
        } else if (key === 'top' && textures.topOverlay && packManifest.textureMappings[textures.topOverlay]) {
          // Create composite texture name
          finalTextureName = `${textureName}+${textures.topOverlay}`;
        }

        // Add texture (composite or base)
        textureSet.add(finalTextureName);

        // Add transformation variants for 3D rendering
        textureSet.add(finalTextureName + '_hflip');
        textureSet.add(finalTextureName + '_rotated90ccw');
        textureSet.add(finalTextureName + '_rotated90ccw_vflip');
      }
    }

    // Add variant textures if present
    if (block.variants) {
      for (const variantName of block.variants) {
        if (packManifest.textureMappings[variantName]) {
          textureSet.add(variantName);
          textureSet.add(variantName + '_hflip');
          textureSet.add(variantName + '_rotated90ccw');
          textureSet.add(variantName + '_rotated90ccw_vflip');
        }
      }
    }
  }

  return textureSet;
}

/**
 * Calculate atlas dimensions (square grid)
 */
function calculateAtlasDimensions(textureCount: number): number {
  return Math.ceil(Math.sqrt(textureCount));
}

/**
 * Composite base texture with tinted overlay
 * Used for grass_block sides (dirt + tinted grass overlay)
 */
async function compositeOverlayTexture(
  basePath: string,
  overlayPath: string,
  transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none'
): Promise<sharp.Sharp> {
  const GRASS_TINT = '#91BD59'; // Minecraft's default grass green

  // Load base texture and apply transformation
  let baseImage = sharp(basePath).ensureAlpha();

  // Apply transformation to base texture
  switch (transform) {
    case 'hflip':
      baseImage = baseImage.flop();
      break;
    case 'rotate':
      baseImage = baseImage.rotate(-90);
      break;
    case 'rotate_vflip':
      baseImage = baseImage.rotate(-90).flip();
      break;
  }

  const baseBuffer = await baseImage.toFormat('png').toBuffer();

  // Load overlay texture and apply SAME transformation
  let overlayImage = sharp(overlayPath).ensureAlpha();

  // Apply transformation to overlay texture
  switch (transform) {
    case 'hflip':
      overlayImage = overlayImage.flop();
      break;
    case 'rotate':
      overlayImage = overlayImage.rotate(-90);
      break;
    case 'rotate_vflip':
      overlayImage = overlayImage.rotate(-90).flip();
      break;
  }

  const overlayRaw = await overlayImage.raw().toBuffer({ resolveWithObject: true });

  // Apply tint to overlay using pixel manipulation
  const overlayPixels = overlayRaw.data;
  const tintedOverlay = Buffer.from(overlayPixels);

  // Parse tint color
  const tintR = parseInt(GRASS_TINT.slice(1, 3), 16);
  const tintG = parseInt(GRASS_TINT.slice(3, 5), 16);
  const tintB = parseInt(GRASS_TINT.slice(5, 7), 16);

  // Apply multiply blend mode to each pixel
  for (let i = 0; i < tintedOverlay.length; i += 4) {
    // Multiply blend: (base * tint) / 255
    tintedOverlay[i] = Math.floor((tintedOverlay[i] * tintR) / 255);     // R
    tintedOverlay[i + 1] = Math.floor((tintedOverlay[i + 1] * tintG) / 255); // G
    tintedOverlay[i + 2] = Math.floor((tintedOverlay[i + 2] * tintB) / 255); // B
    // Alpha channel (i + 3) unchanged
  }

  // Convert tinted overlay buffer back to PNG
  const tintedOverlayPng = await sharp(tintedOverlay, {
    raw: {
      width: overlayRaw.info.width,
      height: overlayRaw.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  // Composite base + tinted overlay (both already transformed)
  const composited = sharp(baseBuffer).composite([
    {
      input: tintedOverlayPng,
      blend: 'over', // Alpha blending
    },
  ]);

  return composited;
}

/**
 * Apply biome tint to a texture
 * Used for grass_block_top, leaves, etc.
 */
async function applyBiomeTint(
  texturePath: string,
  tintColor: string,
  transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none'
): Promise<sharp.Sharp> {
  // Load texture and apply transformation
  let image = sharp(texturePath).ensureAlpha();

  // Apply transformation first
  switch (transform) {
    case 'hflip':
      image = image.flop();
      break;
    case 'rotate':
      image = image.rotate(-90);
      break;
    case 'rotate_vflip':
      image = image.rotate(-90).flip();
      break;
  }

  const rawData = await image.raw().toBuffer({ resolveWithObject: true });

  // Apply tint using pixel manipulation
  const pixels = rawData.data;
  const tintedPixels = Buffer.from(pixels);

  // Parse tint color
  const tintR = parseInt(tintColor.slice(1, 3), 16);
  const tintG = parseInt(tintColor.slice(3, 5), 16);
  const tintB = parseInt(tintColor.slice(5, 7), 16);

  // Apply multiply blend mode to each pixel
  for (let i = 0; i < tintedPixels.length; i += 4) {
    // Multiply blend: (base * tint) / 255
    tintedPixels[i] = Math.floor((tintedPixels[i] * tintR) / 255);     // R
    tintedPixels[i + 1] = Math.floor((tintedPixels[i + 1] * tintG) / 255); // G
    tintedPixels[i + 2] = Math.floor((tintedPixels[i + 2] * tintB) / 255); // B
    // Alpha channel (i + 3) unchanged
  }

  // Convert back to sharp image
  const tinted = sharp(tintedPixels, {
    raw: {
      width: rawData.info.width,
      height: rawData.info.height,
      channels: 4,
    },
  });

  return tinted;
}

/**
 * Load and transform texture
 */
async function loadTexture(
  textureName: string,
  packManifest: PackManifest,
  packSourceDir: string
): Promise<Buffer> {
  let actualTextureName = textureName;
  let transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none';

  // Check for transformation suffix
  if (textureName.endsWith('_rotated90ccw_vflip')) {
    actualTextureName = textureName.replace('_rotated90ccw_vflip', '');
    transform = 'rotate_vflip';
  } else if (textureName.endsWith('_hflip')) {
    actualTextureName = textureName.replace('_hflip', '');
    transform = 'hflip';
  } else if (textureName.endsWith('_rotated90ccw')) {
    actualTextureName = textureName.replace('_rotated90ccw', '');
    transform = 'rotate';
  }

  // Check if this is a composite texture (base+overlay)
  let image: sharp.Sharp;

  if (actualTextureName.includes('+')) {
    // Split composite texture name
    const [baseTextureName, overlayTextureName] = actualTextureName.split('+');

    // Load base and overlay textures
    const basePath = resolveTexturePath(baseTextureName, packManifest, packSourceDir);
    const overlayPath = resolveTexturePath(overlayTextureName, packManifest, packSourceDir);

    if (!basePath || !overlayPath) {
      return createMissingTexture();
    }

    // Composite base + tinted overlay (with transformation applied to both)
    image = await compositeOverlayTexture(basePath, overlayPath, transform);
  } else {
    // Resolve texture path
    const texturePath = resolveTexturePath(actualTextureName, packManifest, packSourceDir);

    if (!texturePath) {
      // Use fallback texture
      const fallbackPath = resolveTexturePath(
        packManifest.fallbacks.missing.replace('.png', ''),
        packManifest,
        packSourceDir
      );

      if (fallbackPath) {
        return fs.readFileSync(fallbackPath);
      }

      // Create magenta checkerboard as last resort
      return createMissingTexture();
    }

    // Check if this texture needs biome tinting (grass_block_top)
    if (actualTextureName.startsWith('grass_block_top')) {
      const GRASS_TINT = '#91BD59'; // Minecraft's default grass green
      image = await applyBiomeTint(texturePath, GRASS_TINT, transform);
    } else {
      // Load texture normally
      image = sharp(texturePath);

      // Ensure alpha channel is preserved (important for indexed-color PNGs)
      image = image.ensureAlpha();

      // Apply transformations to non-composite textures
      switch (transform) {
        case 'hflip':
          image = image.flop();
          break;
        case 'rotate':
          image = image.rotate(-90);
          break;
        case 'rotate_vflip':
          image = image.rotate(-90).flip();
          break;
      }
    }
  }

  // Convert to RGBA to ensure alpha is preserved in atlas
  return image.toFormat('png').toBuffer();
}

/**
 * Create magenta/black checkerboard for missing textures
 */
async function createMissingTexture(): Promise<Buffer> {
  const size = TEXTURE_SIZE;
  const half = size / 2;

  // Create a simple magenta solid color for missing textures
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 255 },
    },
  })
    .png()
    .toBuffer();
}

/**
 * Build the texture atlas
 */
async function buildAtlas(options: BuildOptions): Promise<void> {
  console.log(`🎨 Building texture atlas for pack: ${options.pack}\n`);

  // Load data
  console.log('📚 Loading data...');
  const canonicalBlocks = loadCanonicalBlocks();
  const packManifest = loadPackManifest(options.pack);

  console.log(`   ✓ Loaded ${Object.keys(canonicalBlocks).length} canonical blocks`);
  console.log(`   ✓ Loaded pack manifest: ${packManifest.packName} v${packManifest.version}\n`);

  const packSourceDir = path.resolve(options.source ?? path.join('.cache', 'packs', options.pack));
  if (!fs.existsSync(path.join(packSourceDir, packManifest.textureBasePath))) {
    console.error(`Error: No textures at ${path.join(packSourceDir, packManifest.textureBasePath)}`);
    console.error('Run: npm run setup:textures');
    process.exit(1);
  }

  // Collect unique textures
  console.log('🔍 Collecting textures...');
  const uniqueTextures = Array.from(collectUniqueTextures(canonicalBlocks, packManifest)).sort();
  const gridSize = calculateAtlasDimensions(uniqueTextures.length);
  const atlasSize = gridSize * TEXTURE_SIZE;

  console.log(`   - Unique textures: ${uniqueTextures.length}`);
  console.log(`   - Grid size: ${gridSize}x${gridSize}`);
  console.log(`   - Atlas dimensions: ${atlasSize}x${atlasSize}px\n`);

  // Create texture map
  const textureMap: AtlasMetadata['textureMap'] = {};

  for (let i = 0; i < uniqueTextures.length; i++) {
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    textureMap[uniqueTextures[i]] = {
      x,
      y,
      u: x / gridSize,
      v: y / gridSize,
    };
  }

  // Load and composite textures
  console.log('📦 Loading textures...');

  const composites: Array<{ input: Buffer; top: number; left: number }> = [];

  for (const textureName of uniqueTextures) {
    try {
      const buffer = await loadTexture(textureName, packManifest, packSourceDir);
      const position = textureMap[textureName];

      composites.push({
        input: buffer,
        top: position.y * TEXTURE_SIZE,
        left: position.x * TEXTURE_SIZE,
      });

      if (options.verbose) {
        console.log(`   ✓ ${textureName} -> (${position.x}, ${position.y})`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to load ${textureName}:`, error);
    }
  }

  if (!options.verbose) {
    console.log(`   ✓ Loaded ${composites.length} textures`);
  }

  // Create and composite atlas
  console.log('\n🔨 Compositing atlas...');

  const atlas = sharp({
    create: {
      width: atlasSize,
      height: atlasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const atlasBuffer = await atlas.composite(composites).png().toBuffer();

  // Save atlas image
  const atlasOutputPath = path.join(process.cwd(), 'public', 'atlas.png');
  fs.writeFileSync(atlasOutputPath, atlasBuffer);
  console.log(`   ✓ Atlas saved: ${atlasOutputPath}\n`);

  // Generate UV coordinates
  console.log('📐 Generating UV coordinates...');

  const blockFaceUV: AtlasMetadata['blockFaceUV'] = {};
  const blockFaceUV3D: AtlasMetadata['blockFaceUV3D'] = {};

  const uvSize = 1 / gridSize;

  // Helper to get UV for a texture
  const getUV = (textureName: string) => {
    const pos = textureMap[textureName];
    if (!pos) {
      // Fallback to missing texture
      const fallbackName = packManifest.fallbacks.missing.replace('.png', '');
      const fallbackPos = textureMap[fallbackName];
      if (fallbackPos) {
        return {
          u0: fallbackPos.u,
          v0: fallbackPos.v,
          u1: fallbackPos.u + uvSize,
          v1: fallbackPos.v + uvSize,
        };
      }
      // If even fallback doesn't exist, use first texture
      const firstTexture = Object.values(textureMap)[0];
      if (firstTexture) {
        return {
          u0: firstTexture.u,
          v0: firstTexture.v,
          u1: firstTexture.u + uvSize,
          v1: firstTexture.v + uvSize,
        };
      }
      // Last resort - return (0,0)
      return { u0: 0, v0: 0, u1: uvSize, v1: uvSize };
    }
    return {
      u0: pos.u,
      v0: pos.v,
      u1: pos.u + uvSize,
      v1: pos.v + uvSize,
    };
  };

  // Generate UV coordinates for each block
  // Face order: [front, back, right, left, top, bottom]
  for (const [blockId, block] of Object.entries(canonicalBlocks)) {
    const frontTex = getBlockFaceTexture(block.textures, 'front');
    const backTex = getBlockFaceTexture(block.textures, 'back');
    const rightTex = getBlockFaceTexture(block.textures, 'right');
    const leftTex = getBlockFaceTexture(block.textures, 'left');
    const topTex = getBlockFaceTexture(block.textures, 'top');
    const bottomTex = getBlockFaceTexture(block.textures, 'bottom');

    // 2D UV mapping (normal textures)
    blockFaceUV[blockId] = {
      faceUV: [
        getUV(frontTex),
        getUV(backTex),
        getUV(rightTex),
        getUV(leftTex),
        getUV(topTex),
        getUV(bottomTex),
      ],
      faceOrder: ['front', 'back', 'right', 'left', 'top', 'bottom'],
    };

    // 3D UV mapping (transformed textures for proper orientation)
    blockFaceUV3D[blockId] = {
      faceUV: [
        getUV(frontTex + '_hflip'),
        getUV(backTex),
        getUV(leftTex + '_rotated90ccw_vflip'),  // Swapped
        getUV(rightTex + '_rotated90ccw_vflip'), // Swapped
        getUV(topTex + '_rotated90ccw'),
        getUV(bottomTex),
      ],
      faceOrder: ['front', 'back', 'right', 'left', 'top', 'bottom'],
    };

    if (options.verbose) {
      console.log(`   ✓ ${blockId}`);
    }
  }

  if (!options.verbose) {
    console.log(`   ✓ Generated UV coordinates for ${Object.keys(blockFaceUV).length} blocks`);
  }

  // Create metadata
  const metadata: AtlasMetadata = {
    atlasSize,
    textureSize: TEXTURE_SIZE,
    textureCount: uniqueTextures.length,
    textureMap,
    blockFaceUV,
    blockFaceUV3D,
  };

  // Save metadata
  const metadataOutputPath = path.join(process.cwd(), 'public', 'atlas.json');
  fs.writeFileSync(metadataOutputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ Metadata saved: ${metadataOutputPath}`);

  console.log('\n✅ Atlas build complete!\n');
}

// Run if called directly
const exitWithError = (error: unknown): void => {
  console.error('Fatal error:', error);
  process.exit(1);
};

const options = parseArgs();
if (options) {
  buildAtlas(options).catch(exitWithError);
}

export { buildAtlas };

#!/usr/bin/env npx tsx

/**
 * Builds public/atlas.png and public/atlas.json from data/canonical-blocks.json and a pack manifest.
 * scripts/setupTextures.ts runs it after downloading the pack. src/core/TextureResolver.ts reads the output.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

import type {
  CanonicalBlocks,
  PackManifest,
  BlockTextures,
} from '../src/types/canonical';

const TEXTURE_SIZE = 16;

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

function getBlockFaceTexture(
  blockTextures: BlockTextures,
  face: 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom'
): string {
  const faceMap: Record<typeof face, keyof BlockTextures> = {
    front: 'north',
    back: 'south',
    right: 'east',
    left: 'west',
    top: 'top',
    bottom: 'bottom',
  };

  const textureKey = faceMap[face];

  let textureName = blockTextures[textureKey] || blockTextures.side || blockTextures.all || 'missing';

  if (face === 'top' && blockTextures.top && blockTextures.topOverlay) {
    textureName = `${blockTextures.top}+${blockTextures.topOverlay}`;
  } else if (
    (face === 'front' || face === 'back' || face === 'right' || face === 'left') &&
    blockTextures.side &&
    blockTextures.sideOverlay &&
    !blockTextures[textureKey]
  ) {
    textureName = `${blockTextures.side}+${blockTextures.sideOverlay}`;
  }

  return textureName;
}

function collectUniqueTextures(
  canonicalBlocks: CanonicalBlocks,
  packManifest: PackManifest
): Set<string> {
  const textureSet = new Set<string>();

  for (const block of Object.values(canonicalBlocks)) {
    const textures = block.textures;

    for (const [key, textureName] of Object.entries(textures)) {
      // Skip overlay keys - they'll be handled by compositing
      if (key.endsWith('Overlay')) {
        continue;
      }

      if (textureName && packManifest.textureMappings[textureName]) {
        let finalTextureName = textureName;

        if (key === 'side' && textures.sideOverlay && packManifest.textureMappings[textures.sideOverlay]) {
          finalTextureName = `${textureName}+${textures.sideOverlay}`;
        } else if (key === 'top' && textures.topOverlay && packManifest.textureMappings[textures.topOverlay]) {
          finalTextureName = `${textureName}+${textures.topOverlay}`;
        }

        textureSet.add(finalTextureName);

        // Add transformation variants for 3D rendering
        textureSet.add(finalTextureName + '_hflip');
        textureSet.add(finalTextureName + '_rotated90ccw');
        textureSet.add(finalTextureName + '_rotated90ccw_vflip');
      }
    }

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

function reverseV(uv: { u0: number; v0: number; u1: number; v1: number }): { u0: number; v0: number; u1: number; v1: number } {
  return { u0: uv.u0, v0: uv.v1, u1: uv.u1, v1: uv.v0 };
}

function calculateAtlasDimensions(textureCount: number): number {
  return Math.ceil(Math.sqrt(textureCount));
}

/**
 * An animated texture stacks its frames in a vertical strip. Composited whole, the strip would paint over the
 * atlas cells below its own, so only the top square, the first frame, enters the atlas.
 */
async function openFirstFrame(texturePath: string): Promise<sharp.Sharp> {
  const { width = TEXTURE_SIZE, height = TEXTURE_SIZE } = await sharp(texturePath).metadata();
  if (width === TEXTURE_SIZE && height === TEXTURE_SIZE) return sharp(texturePath);
  const frame = await sharp(texturePath)
    .extract({ left: 0, top: 0, width, height: Math.min(width, height) })
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { kernel: 'nearest' })
    .png()
    .toBuffer();
  return sharp(frame);
}

/**
 * Base texture with a tinted overlay on top, as on grass_block sides (dirt under tinted grass)
 */
async function compositeOverlayTexture(
  basePath: string,
  overlayPath: string,
  transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none'
): Promise<sharp.Sharp> {
  const GRASS_TINT = '#91BD59'; // Minecraft's default plains grass color

  let baseImage = (await openFirstFrame(basePath)).ensureAlpha();

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

  // The overlay takes the base's transform, or the two layers misalign
  let overlayImage = (await openFirstFrame(overlayPath)).ensureAlpha();

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

  const overlayPixels = overlayRaw.data;
  const tintedOverlay = Buffer.from(overlayPixels);

  const tintR = parseInt(GRASS_TINT.slice(1, 3), 16);
  const tintG = parseInt(GRASS_TINT.slice(3, 5), 16);
  const tintB = parseInt(GRASS_TINT.slice(5, 7), 16);

  for (let i = 0; i < tintedOverlay.length; i += 4) {
    // Multiply blend: (base * tint) / 255
    tintedOverlay[i] = Math.floor((tintedOverlay[i] * tintR) / 255);
    tintedOverlay[i + 1] = Math.floor((tintedOverlay[i + 1] * tintG) / 255);
    tintedOverlay[i + 2] = Math.floor((tintedOverlay[i + 2] * tintB) / 255);
  }

  const tintedOverlayPng = await sharp(tintedOverlay, {
    raw: {
      width: overlayRaw.info.width,
      height: overlayRaw.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  const composited = sharp(baseBuffer).composite([
    {
      input: tintedOverlayPng,
      blend: 'over',
    },
  ]);

  return composited;
}

/**
 * Multiply a texture by a biome tint. Only grass_block_top uses it.
 */
async function applyBiomeTint(
  texturePath: string,
  tintColor: string,
  transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none'
): Promise<sharp.Sharp> {
  let image = (await openFirstFrame(texturePath)).ensureAlpha();

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

  const pixels = rawData.data;
  const tintedPixels = Buffer.from(pixels);

  const tintR = parseInt(tintColor.slice(1, 3), 16);
  const tintG = parseInt(tintColor.slice(3, 5), 16);
  const tintB = parseInt(tintColor.slice(5, 7), 16);

  for (let i = 0; i < tintedPixels.length; i += 4) {
    // Multiply blend: (base * tint) / 255
    tintedPixels[i] = Math.floor((tintedPixels[i] * tintR) / 255);
    tintedPixels[i + 1] = Math.floor((tintedPixels[i + 1] * tintG) / 255);
    tintedPixels[i + 2] = Math.floor((tintedPixels[i + 2] * tintB) / 255);
  }

  const tinted = sharp(tintedPixels, {
    raw: {
      width: rawData.info.width,
      height: rawData.info.height,
      channels: 4,
    },
  });

  return tinted;
}

async function loadTexture(
  textureName: string,
  packManifest: PackManifest,
  packSourceDir: string
): Promise<Buffer> {
  let actualTextureName = textureName;
  let transform: 'none' | 'hflip' | 'rotate' | 'rotate_vflip' = 'none';

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

  let image: sharp.Sharp;

  if (actualTextureName.includes('+')) {
    const [baseTextureName, overlayTextureName] = actualTextureName.split('+');

    const basePath = resolveTexturePath(baseTextureName, packManifest, packSourceDir);
    const overlayPath = resolveTexturePath(overlayTextureName, packManifest, packSourceDir);

    if (!basePath || !overlayPath) {
      return createMissingTexture();
    }

    image = await compositeOverlayTexture(basePath, overlayPath, transform);
  } else {
    const texturePath = resolveTexturePath(actualTextureName, packManifest, packSourceDir);

    if (!texturePath) {
      const fallbackPath = resolveTexturePath(
        packManifest.fallbacks.missing.replace('.png', ''),
        packManifest,
        packSourceDir
      );

      if (fallbackPath) {
        return fs.readFileSync(fallbackPath);
      }

      return createMissingTexture();
    }

    if (actualTextureName.startsWith('grass_block_top')) {
      const GRASS_TINT = '#91BD59'; // Minecraft's default plains grass color
      image = await applyBiomeTint(texturePath, GRASS_TINT, transform);
    } else {
      image = await openFirstFrame(texturePath);

      // Indexed-color PNGs lose transparency without an explicit alpha channel
      image = image.ensureAlpha();

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

  return image.toFormat('png').toBuffer();
}

// Solid magenta, so a missing texture stands out in the 3D view
async function createMissingTexture(): Promise<Buffer> {
  const size = TEXTURE_SIZE;
  const half = size / 2;

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

async function buildAtlas(options: BuildOptions): Promise<void> {
  console.log(`🎨 Building texture atlas for pack: ${options.pack}\n`);

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

  console.log('🔍 Collecting textures...');
  const uniqueTextures = Array.from(collectUniqueTextures(canonicalBlocks, packManifest)).sort();
  const gridSize = calculateAtlasDimensions(uniqueTextures.length);
  const atlasSize = gridSize * TEXTURE_SIZE;

  console.log(`   - Unique textures: ${uniqueTextures.length}`);
  console.log(`   - Grid size: ${gridSize}x${gridSize}`);
  console.log(`   - Atlas dimensions: ${atlasSize}x${atlasSize}px\n`);

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

  const atlasOutputPath = path.join(process.cwd(), 'public', 'atlas.png');
  fs.writeFileSync(atlasOutputPath, atlasBuffer);
  console.log(`   ✓ Atlas saved: ${atlasOutputPath}\n`);

  console.log('📐 Generating UV coordinates...');

  const blockFaceUV: AtlasMetadata['blockFaceUV'] = {};
  const blockFaceUV3D: AtlasMetadata['blockFaceUV3D'] = {};

  const uvSize = 1 / gridSize;

  const getUV = (textureName: string) => {
    const pos = textureMap[textureName];
    if (!pos) {
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
      const firstTexture = Object.values(textureMap)[0];
      if (firstTexture) {
        return {
          u0: firstTexture.u,
          v0: firstTexture.v,
          u1: firstTexture.u + uvSize,
          v1: firstTexture.v + uvSize,
        };
      }
      return { u0: 0, v0: 0, u1: uvSize, v1: uvSize };
    }
    return {
      u0: pos.u,
      v0: pos.v,
      u1: pos.u + uvSize,
      v1: pos.v + uvSize,
    };
  };

  for (const [blockId, block] of Object.entries(canonicalBlocks)) {
    const frontTex = getBlockFaceTexture(block.textures, 'front');
    const backTex = getBlockFaceTexture(block.textures, 'back');
    const rightTex = getBlockFaceTexture(block.textures, 'right');
    const leftTex = getBlockFaceTexture(block.textures, 'left');
    const topTex = getBlockFaceTexture(block.textures, 'top');
    const bottomTex = getBlockFaceTexture(block.textures, 'bottom');

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

    // CreateBox orients each face's UVs its own way, and the right and left slots take each other's texture.
    // The back slot reverses its V range instead of using a vertically flipped tile.
    // src/core/rendering/README.md has the face table.
    blockFaceUV3D[blockId] = {
      faceUV: [
        getUV(frontTex + '_hflip'),
        reverseV(getUV(backTex)),
        getUV(leftTex + '_rotated90ccw_vflip'),
        getUV(rightTex + '_rotated90ccw_vflip'),
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

  const metadata: AtlasMetadata = {
    atlasSize,
    textureSize: TEXTURE_SIZE,
    textureCount: uniqueTextures.length,
    textureMap,
    blockFaceUV,
    blockFaceUV3D,
  };

  const metadataOutputPath = path.join(process.cwd(), 'public', 'atlas.json');
  fs.writeFileSync(metadataOutputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ Metadata saved: ${metadataOutputPath}`);

  console.log('\n✅ Atlas build complete!\n');
}

const exitWithError = (error: unknown): void => {
  console.error('Fatal error:', error);
  process.exit(1);
};

const options = parseArgs();
if (options) {
  buildAtlas(options).catch(exitWithError);
}

export { buildAtlas };

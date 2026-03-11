/**
 * Texture Atlas Builder
 *
 * Pre-computes a Minecraft-style texture atlas by stitching individual
 * block textures into a single image and generating UV coordinates.
 *
 * Usage: npx tsx scripts/buildTextureAtlas.ts
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Texture resolution (Minecraft standard)
const TEXTURE_SIZE = 16;

// Block texture definitions - matches our BlockRegistry
interface BlockTextureDef {
  blockId: string;
  textures: {
    all?: string;
    top?: string;
    bottom?: string;
    side?: string;
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  };
}

// Atlas metadata output
interface AtlasMetadata {
  atlasSize: number;
  textureSize: number;
  textureCount: number;
  textureMap: Record<string, { x: number; y: number; u: number; v: number }>;
  blockFaceUV: Record<string, {
    faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
    faceOrder: string[]; // ['front', 'back', 'right', 'left', 'top', 'bottom']
  }>;
  blockFaceUV3D: Record<string, {
    faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
    faceOrder: string[]; // ['front', 'back', 'right', 'left', 'top', 'bottom']
  }>;
}

// Define all blocks and their textures (from BlockRegistry)
const BLOCK_TEXTURES: BlockTextureDef[] = [
  // Simple blocks (single texture)
  { blockId: 'stone', textures: { all: 'default_stone.png' } },
  { blockId: 'cobblestone', textures: { all: 'default_cobble.png' } },
  { blockId: 'stone_bricks', textures: { all: 'default_stone_brick.png' } },
  { blockId: 'granite', textures: { all: 'default_stone.png' } },
  { blockId: 'andesite', textures: { all: 'default_stone.png' } },
  { blockId: 'diorite', textures: { all: 'default_stone.png' } },
  { blockId: 'oak_planks', textures: { all: 'default_wood.png' } },
  { blockId: 'spruce_planks', textures: { all: 'default_pine_wood.png' } },
  { blockId: 'birch_planks', textures: { all: 'default_wood.png' } },
  { blockId: 'dark_oak_planks', textures: { all: 'default_wood.png' } },
  { blockId: 'glass', textures: { all: 'default_glass.png' } },
  { blockId: 'white_stained_glass', textures: { all: 'default_glass.png' } },
  { blockId: 'red_stained_glass', textures: { all: 'default_glass.png' } },
  { blockId: 'blue_stained_glass', textures: { all: 'default_glass.png' } },
  { blockId: 'green_stained_glass', textures: { all: 'default_glass.png' } },
  { blockId: 'brick', textures: { all: 'default_brick.png' } },
  { blockId: 'sandstone', textures: { all: 'default_sandstone.png' } },
  { blockId: 'quartz', textures: { all: 'default_stone.png' } },
  { blockId: 'gold_block', textures: { all: 'default_gold_block.png' } },
  { blockId: 'diamond_block', textures: { all: 'default_diamond_block.png' } },
  { blockId: 'emerald_block', textures: { all: 'default_stone.png' } },
  { blockId: 'dirt', textures: { all: 'default_dirt.png' } },
  { blockId: 'sand', textures: { all: 'default_sand.png' } },
  { blockId: 'gravel', textures: { all: 'default_gravel.png' } },
  { blockId: 'snow', textures: { all: 'default_snow.png' } },
  { blockId: 'ice', textures: { all: 'default_ice.png' } },

  // Multi-face blocks
  {
    blockId: 'oak_log',
    textures: {
      top: 'default_tree_top.png',
      bottom: 'default_tree_top.png',
      side: 'default_tree.png'
    }
  },
  {
    blockId: 'spruce_log',
    textures: {
      top: 'default_pine_tree_top.png',
      bottom: 'default_pine_tree_top.png',
      side: 'default_pine_tree.png'
    }
  },
  {
    blockId: 'birch_log',
    textures: {
      top: 'default_tree_top.png',
      bottom: 'default_tree_top.png',
      side: 'default_tree.png'
    }
  },
  {
    blockId: 'grass_block',
    textures: {
      top: 'default_grass.png',
      side: 'default_grass_side.png',
      bottom: 'default_dirt.png'
    }
  },

  // DEBUG block with directional arrows
  {
    blockId: 'debug_arrows',
    textures: {
      all: 'debug_arrows.png'
    }
  },

  // Face letters debug block
  {
    blockId: 'face_letters',
    textures: {
      top: 'face_top.png',
      bottom: 'face_bottom.png',
      north: 'face_back.png',
      south: 'face_front.png',
      east: 'face_right.png',
      west: 'face_left.png',
    }
  },
];

// Collect all unique textures
function collectUniqueTextures(): string[] {
  const textureSet = new Set<string>();

  for (const block of BLOCK_TEXTURES) {
    for (const texture of Object.values(block.textures)) {
      if (texture) {
        textureSet.add(texture);
        // Add variants for 3D face orientations
        textureSet.add(texture + '_rotated90ccw_vflip');  // For left/right faces
        textureSet.add(texture + '_hflip');                // For front face
        textureSet.add(texture + '_rotated90ccw');         // For top face
      }
    }
  }

  return Array.from(textureSet).sort();
}

// Calculate atlas dimensions (square grid)
function calculateAtlasDimensions(textureCount: number): number {
  return Math.ceil(Math.sqrt(textureCount));
}

// Build the texture atlas
async function buildAtlas(): Promise<void> {
  console.log('🎨 Building Minecraft-style texture atlas...\n');

  const uniqueTextures = collectUniqueTextures();
  const gridSize = calculateAtlasDimensions(uniqueTextures.length);
  const atlasSize = gridSize * TEXTURE_SIZE;

  console.log(`📊 Atlas Info:`);
  console.log(`   - Unique textures: ${uniqueTextures.length}`);
  console.log(`   - Grid size: ${gridSize}x${gridSize}`);
  console.log(`   - Atlas dimensions: ${atlasSize}x${atlasSize}px\n`);

  // Create texture map (texture filename -> grid position)
  const textureMap: Record<string, { x: number; y: number; u: number; v: number }> = {};

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

  // Create composites array for sharp
  const composites: Array<{ input: Buffer; top: number; left: number }> = [];
  const texturePath = join(process.cwd(), 'public', 'PixelBOX');

  console.log('📦 Loading textures...');

  for (const [filename, position] of Object.entries(textureMap)) {
    try {
      let buffer: Buffer;
      let actualFilename = filename;

      // Check if this is a transformed version
      if (filename.endsWith('_rotated90ccw_vflip')) {
        // For left/right faces: rotate 90° CCW and flip vertically
        actualFilename = filename.replace('_rotated90ccw_vflip', '');
        const filePath = join(texturePath, actualFilename);
        buffer = await sharp(filePath)
          .rotate(-90)  // 90° CCW
          .flip()       // Vertical flip
          .toBuffer();
        console.log(`   ✓ ${filename} (rot90ccw+vflip) -> (${position.x}, ${position.y})`);
      } else if (filename.endsWith('_hflip')) {
        // For front face: flip horizontally
        actualFilename = filename.replace('_hflip', '');
        const filePath = join(texturePath, actualFilename);
        buffer = await sharp(filePath)
          .flop()       // Horizontal flip
          .toBuffer();
        console.log(`   ✓ ${filename} (hflip) -> (${position.x}, ${position.y})`);
      } else if (filename.endsWith('_rotated90ccw')) {
        // For top face: rotate 90° CCW only
        actualFilename = filename.replace('_rotated90ccw', '');
        const filePath = join(texturePath, actualFilename);
        buffer = await sharp(filePath)
          .rotate(-90)  // 90° CCW
          .toBuffer();
        console.log(`   ✓ ${filename} (rot90ccw) -> (${position.x}, ${position.y})`);
      } else {
        const filePath = join(texturePath, actualFilename);
        buffer = readFileSync(filePath);
        console.log(`   ✓ ${filename} -> (${position.x}, ${position.y})`);
      }

      composites.push({
        input: buffer,
        top: position.y * TEXTURE_SIZE,
        left: position.x * TEXTURE_SIZE,
      });
    } catch (error) {
      console.error(`   ✗ Failed to load ${filename}:`, error);
    }
  }

  console.log('\n🔨 Compositing atlas...');

  // Create blank atlas
  const atlas = sharp({
    create: {
      width: atlasSize,
      height: atlasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Composite all textures
  const atlasBuffer = await atlas
    .composite(composites)
    .png()
    .toBuffer();

  // Save atlas image
  const atlasOutputPath = join(process.cwd(), 'public', 'pixelbox-atlas.png');
  writeFileSync(atlasOutputPath, atlasBuffer);
  console.log(`✓ Atlas saved: ${atlasOutputPath}\n`);

  // Generate block face UV coordinates
  console.log('📐 Generating UV coordinates...');

  const blockFaceUV: AtlasMetadata['blockFaceUV'] = {};
  const blockFaceUV3D: AtlasMetadata['blockFaceUV3D'] = {};

  // BabylonJS face order: [front(+Z), back(-Z), right(+X), left(-X), top(+Y), bottom(-Y)]
  // Our coordinate system: X=width, Y=depth, Z=height
  // Conversion: Our (x,y,z) → Babylon (x,z,y) [NO NEGATION]
  //   Our X → Babylon X
  //   Our Y → Babylon Z
  //   Our Z → Babylon Y
  // Therefore: Babylon Face 0 (+Z) = Our +Y (south/front), Babylon Face 1 (-Z) = Our -Y (north/back)

  for (const block of BLOCK_TEXTURES) {
    const uvSize = 1 / gridSize;

    // Helper to get UV for a texture
    const getUV = (textureName: string | undefined) => {
      if (!textureName) textureName = block.textures.all || 'default_stone.png';
      const pos = textureMap[textureName];
      return {
        u0: pos.u,
        v0: pos.v,
        u1: pos.u + uvSize,
        v1: pos.v + uvSize,
      };
    };

    // Determine textures for each face IN OUR COORDINATE SYSTEM
    const ourFrontTex = block.textures.south || block.textures.side || block.textures.all;  // Our +Y
    const ourBackTex = block.textures.north || block.textures.side || block.textures.all;   // Our -Y
    const rightTex = block.textures.east || block.textures.side || block.textures.all;      // Our +X
    const leftTex = block.textures.west || block.textures.side || block.textures.all;       // Our -X
    const topTex = block.textures.top || block.textures.all;                                 // Our +Z
    const bottomTex = block.textures.bottom || block.textures.all;                           // Our -Z

    // Transformed versions for 3D (each face needs specific transformation)
    const frontTexHFlip = (ourFrontTex || '') + '_hflip';           // Front: horizontal flip
    const rightTexRotVFlip = (rightTex || '') + '_rotated90ccw_vflip';  // Right: rot+vflip
    const leftTexRotVFlip = (leftTex || '') + '_rotated90ccw_vflip';    // Left: rot+vflip
    const topTexRot = (topTex || '') + '_rotated90ccw';             // Top: rotate only

    // 2D UV mapping - normal textures, normal order
    blockFaceUV[block.blockId] = {
      faceUV: [
        getUV(ourFrontTex),      // Face 0: front
        getUV(ourBackTex),       // Face 1: back
        getUV(rightTex),         // Face 2: right
        getUV(leftTex),          // Face 3: left
        getUV(topTex),           // Face 4: top
        getUV(bottomTex),        // Face 5: bottom
      ],
      faceOrder: ['front', 'back', 'right', 'left', 'top', 'bottom'],
    };

    // 3D UV mapping - each face gets its specific transformation
    blockFaceUV3D[block.blockId] = {
      faceUV: [
        getUV(frontTexHFlip),    // Face 0: front (hflip)
        getUV(ourBackTex),       // Face 1: back (normal for now)
        getUV(leftTexRotVFlip),  // Face 2: SWAPPED to left (rot+vflip)
        getUV(rightTexRotVFlip), // Face 3: SWAPPED to right (rot+vflip)
        getUV(topTexRot),        // Face 4: top (rot90ccw)
        getUV(bottomTex),        // Face 5: bottom (normal for now)
      ],
      faceOrder: ['front', 'back', 'right', 'left', 'top', 'bottom'],
    };

    console.log(`   ✓ ${block.blockId}`);
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
  const metadataOutputPath = join(process.cwd(), 'public', 'pixelbox-atlas.json');
  writeFileSync(metadataOutputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ Metadata saved: ${metadataOutputPath}`);

  console.log('\n✅ Atlas build complete!\n');
}

// Run the build
buildAtlas().catch(console.error);

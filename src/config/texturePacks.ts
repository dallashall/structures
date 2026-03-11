import type { TexturePack } from '../types';

/**
 * PixelBOX texture pack configuration
 *
 * Maps internal block IDs to PixelBOX texture filenames.
 * PixelBOX uses Minetest naming conventions (default_*, farming_*, etc.)
 */
export const PIXELBOX_PACK: TexturePack = {
  id: 'pixelbox',
  name: 'PixelBOX',
  version: '1.0.0',
  resolution: 16,
  basePath: '/PixelBOX/',
  mappings: {
    // Stone blocks
    'stone': 'default_stone.png',
    'cobblestone': 'default_cobble.png',
    'stone_bricks': 'default_stone_brick.png',
    'granite': 'default_stone.png',  // Fallback to stone
    'andesite': 'default_stone.png', // Fallback to stone
    'diorite': 'default_stone.png',  // Fallback to stone

    // Wood blocks (planks)
    'oak_planks': 'default_wood.png',
    'spruce_planks': 'default_pine_wood.png',
    'birch_planks': 'default_wood.png',  // Fallback to oak
    'dark_oak_planks': 'default_wood.png', // Fallback to oak

    // Wood blocks (logs) - multi-face
    'oak_log': 'default_tree.png',
    'spruce_log': 'default_pine_tree.png',
    'birch_log': 'default_tree.png',  // Fallback to oak

    // Glass blocks
    'glass': 'default_glass.png',
    'white_stained_glass': 'default_glass.png',
    'red_stained_glass': 'default_glass.png',
    'blue_stained_glass': 'default_glass.png',
    'green_stained_glass': 'default_glass.png',

    // Decoration blocks
    'brick': 'default_brick.png',
    'sandstone': 'default_sandstone.png',
    'quartz': 'default_stone.png',  // Fallback to stone
    'gold_block': 'default_gold_block.png',
    'diamond_block': 'default_diamond_block.png',
    'emerald_block': 'default_stone.png',  // Fallback to stone

    // Misc blocks
    'dirt': 'default_dirt.png',
    'grass_block': 'default_grass',  // Multi-face: will append _top, _side
    'sand': 'default_sand.png',
    'gravel': 'default_gravel.png',
    'snow': 'default_snow.png',
    'ice': 'default_ice.png',
  }
};

/**
 * Default color-only pack (fallback)
 */
export const DEFAULT_PACK: TexturePack = {
  id: 'default',
  name: 'Default Colors',
  version: '1.0.0',
  resolution: 1,
  basePath: '',
  mappings: {}
};

/**
 * Get texture pack by ID
 */
export function getTexturePack(id: string): TexturePack | null {
  const packs: Record<string, TexturePack> = {
    'pixelbox': PIXELBOX_PACK,
    'default': DEFAULT_PACK,
  };
  return packs[id] || null;
}

/**
 * Get all available texture packs
 */
export function getAllTexturePacks(): TexturePack[] {
  return [PIXELBOX_PACK, DEFAULT_PACK];
}

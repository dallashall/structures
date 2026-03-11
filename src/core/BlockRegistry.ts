import { EventEmitter } from './EventEmitter';
import type { Block, BlockStateProperties, BlockVariant } from '../types';

/**
 * BlockRegistry - Catalog of available Minecraft blocks
 *
 * Singleton class that provides:
 * - Block catalog with categories
 * - Block lookup by ID
 * - Category filtering
 * - Fuzzy search functionality
 *
 * Events:
 * - blocks:loaded - When blocks are loaded into the registry
 */
class BlockRegistry extends EventEmitter {
  private static instance: BlockRegistry;
  private blocks: Map<string, Block> = new Map();

  private constructor() {
    super();
    this.initializeBlocks();
    // Texture atlas is loaded automatically by TextureManager
  }

  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  /**
   * Get a block by ID
   */
  getBlock(blockId: string): Block | null {
    return this.blocks.get(blockId) || null;
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): Block[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get blocks filtered by category
   */
  getBlocksByCategory(category: string): Block[] {
    return this.getAllBlocks().filter(
      (block) => block.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Search blocks by name (fuzzy search)
   * Returns blocks that contain the query string in their name
   */
  searchBlocks(query: string): Block[] {
    if (!query || query.trim().length === 0) {
      return this.getAllBlocks();
    }

    const lowerQuery = query.toLowerCase();
    return this.getAllBlocks().filter((block) =>
      block.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Register a new block or update existing one
   */
  registerBlock(block: Block): void {
    this.blocks.set(block.id, block);
    this.emit('blocks:loaded', this.getAllBlocks());
  }

  /**
   * Get block with variant based on blockstate
   * Returns the block and matching variant if blockstate properties match
   *
   * @param blockId - Block ID
   * @param state - Optional blockstate properties
   * @returns Object with block and optional variant
   */
  getBlockWithState(
    blockId: string,
    state?: BlockStateProperties
  ): { block: Block | null; variant?: BlockVariant } {
    const block = this.getBlock(blockId);
    if (!block) return { block: null };

    if (!block.hasBlockState || !state || !block.variants) {
      return { block };
    }

    // Find matching variant
    const variant = block.variants.find((v) =>
      this.matchesState(v.stateProperties, state)
    );

    return { block, variant };
  }

  /**
   * Check if blockstate matches variant requirements
   * All properties in required must match actual
   */
  private matchesState(
    required: BlockStateProperties,
    actual: BlockStateProperties
  ): boolean {
    for (const key in required) {
      if (required[key as keyof BlockStateProperties] !== actual[key as keyof BlockStateProperties]) {
        return false;
      }
    }
    return true;
  }


  /**
   * Initialize the registry with common Minecraft blocks
   */
  private initializeBlocks(): void {
    const initialBlocks: Block[] = [
      // Stone blocks
      {
        id: 'stone',
        name: 'Stone',
        category: 'stone',
        color: '#7f7f7f',
        javaId: 'minecraft:stone',
        bedrockId: 'minecraft:stone',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'cobblestone',
        name: 'Cobblestone',
        category: 'stone',
        color: '#6e6e6e',
        javaId: 'minecraft:cobblestone',
        bedrockId: 'minecraft:cobblestone',
        textures: { all: 'default_cobble.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'stone_bricks',
        name: 'Stone Bricks',
        category: 'stone',
        color: '#787878',
        javaId: 'minecraft:stone_bricks',
        bedrockId: 'minecraft:stonebrick',
        textures: { all: 'default_stone_brick.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'granite',
        name: 'Granite',
        category: 'stone',
        color: '#9a6c5b',
        javaId: 'minecraft:granite',
        bedrockId: 'minecraft:stone',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'andesite',
        name: 'Andesite',
        category: 'stone',
        color: '#8c8c8c',
        javaId: 'minecraft:andesite',
        bedrockId: 'minecraft:stone',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'diorite',
        name: 'Diorite',
        category: 'stone',
        color: '#c9c9c9',
        javaId: 'minecraft:diorite',
        bedrockId: 'minecraft:stone',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },

      // Wood blocks (planks)
      {
        id: 'oak_planks',
        name: 'Oak Planks',
        category: 'wood',
        color: '#9c7f4e',
        javaId: 'minecraft:oak_planks',
        bedrockId: 'minecraft:planks',
        textures: { all: 'default_wood.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'oak_log',
        name: 'Oak Log',
        category: 'wood',
        color: '#6f5436',
        javaId: 'minecraft:oak_log',
        bedrockId: 'minecraft:log',
        textures: {
          top: 'default_tree_top.png',
          bottom: 'default_tree_top.png',
          side: 'default_tree.png',
        },
        hasBlockState: true,
        defaultState: { axis: 'y' },
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'spruce_planks',
        name: 'Spruce Planks',
        category: 'wood',
        color: '#7a5a3a',
        javaId: 'minecraft:spruce_planks',
        bedrockId: 'minecraft:planks',
        textures: { all: 'default_pine_wood.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'spruce_log',
        name: 'Spruce Log',
        category: 'wood',
        color: '#4a3728',
        javaId: 'minecraft:spruce_log',
        bedrockId: 'minecraft:log',
        textures: {
          top: 'default_pine_tree_top.png',
          bottom: 'default_pine_tree_top.png',
          side: 'default_pine_tree.png',
        },
        hasBlockState: true,
        defaultState: { axis: 'y' },
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'birch_planks',
        name: 'Birch Planks',
        category: 'wood',
        color: '#d7cb8d',
        javaId: 'minecraft:birch_planks',
        bedrockId: 'minecraft:planks',
        textures: { all: 'default_wood.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'birch_log',
        name: 'Birch Log',
        category: 'wood',
        color: '#d9d9d9',
        javaId: 'minecraft:birch_log',
        bedrockId: 'minecraft:log',
        textures: {
          top: 'default_tree_top.png',
          bottom: 'default_tree_top.png',
          side: 'default_tree.png',
        },
        hasBlockState: true,
        defaultState: { axis: 'y' },
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'dark_oak_planks',
        name: 'Dark Oak Planks',
        category: 'wood',
        color: '#3f2a15',
        javaId: 'minecraft:dark_oak_planks',
        bedrockId: 'minecraft:planks',
        textures: { all: 'default_wood.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },

      // Glass blocks
      {
        id: 'glass',
        name: 'Glass',
        category: 'glass',
        color: '#c0f4ff',
        javaId: 'minecraft:glass',
        bedrockId: 'minecraft:glass',
        textures: { all: 'default_glass.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },
      {
        id: 'white_stained_glass',
        name: 'White Stained Glass',
        category: 'glass',
        color: '#ffffff',
        javaId: 'minecraft:white_stained_glass',
        bedrockId: 'minecraft:stained_glass',
        textures: { all: 'default_glass.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },
      {
        id: 'red_stained_glass',
        name: 'Red Stained Glass',
        category: 'glass',
        color: '#993333',
        javaId: 'minecraft:red_stained_glass',
        bedrockId: 'minecraft:stained_glass',
        textures: { all: 'default_glass.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },
      {
        id: 'blue_stained_glass',
        name: 'Blue Stained Glass',
        category: 'glass',
        color: '#334cb2',
        javaId: 'minecraft:blue_stained_glass',
        bedrockId: 'minecraft:stained_glass',
        textures: { all: 'default_glass.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },
      {
        id: 'green_stained_glass',
        name: 'Green Stained Glass',
        category: 'glass',
        color: '#667f33',
        javaId: 'minecraft:green_stained_glass',
        bedrockId: 'minecraft:stained_glass',
        textures: { all: 'default_glass.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },

      // Decoration blocks
      {
        id: 'brick',
        name: 'Bricks',
        category: 'decoration',
        color: '#9b6258',
        javaId: 'minecraft:bricks',
        bedrockId: 'minecraft:brick_block',
        textures: { all: 'default_brick.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'sandstone',
        name: 'Sandstone',
        category: 'decoration',
        color: '#e0d8a9',
        javaId: 'minecraft:sandstone',
        bedrockId: 'minecraft:sandstone',
        textures: { all: 'default_sandstone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'quartz',
        name: 'Quartz Block',
        category: 'decoration',
        color: '#ebe4da',
        javaId: 'minecraft:quartz_block',
        bedrockId: 'minecraft:quartz_block',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'gold_block',
        name: 'Gold Block',
        category: 'decoration',
        color: '#fcee4b',
        javaId: 'minecraft:gold_block',
        bedrockId: 'minecraft:gold_block',
        textures: { all: 'default_gold_block.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'diamond_block',
        name: 'Diamond Block',
        category: 'decoration',
        color: '#5decf5',
        javaId: 'minecraft:diamond_block',
        bedrockId: 'minecraft:diamond_block',
        textures: { all: 'default_diamond_block.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'emerald_block',
        name: 'Emerald Block',
        category: 'decoration',
        color: '#3cb878',
        javaId: 'minecraft:emerald_block',
        bedrockId: 'minecraft:emerald_block',
        textures: { all: 'default_stone.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },

      // Misc blocks
      {
        id: 'dirt',
        name: 'Dirt',
        category: 'misc',
        color: '#8c6344',
        javaId: 'minecraft:dirt',
        bedrockId: 'minecraft:dirt',
        textures: { all: 'default_dirt.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'grass_block',
        name: 'Grass Block',
        category: 'misc',
        color: '#79c05a',
        javaId: 'minecraft:grass_block',
        bedrockId: 'minecraft:grass',
        textures: {
          top: 'default_grass.png',
          side: 'default_grass_side.png',
          bottom: 'default_dirt.png',
        },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'debug_arrows',
        name: 'Debug Arrows',
        category: 'misc',
        color: '#444444',
        javaId: 'minecraft:debug',
        bedrockId: 'minecraft:debug',
        textures: {
          all: 'debug_arrows.png',
        },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'face_letters',
        name: 'Face Letters',
        category: 'misc',
        color: '#555555',
        javaId: 'minecraft:face_letters',
        bedrockId: 'minecraft:face_letters',
        textures: {
          top: 'face_top.png',
          bottom: 'face_bottom.png',
          north: 'face_back.png',
          south: 'face_front.png',
          east: 'face_right.png',
          west: 'face_left.png',
        },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'sand',
        name: 'Sand',
        category: 'misc',
        color: '#dbd3a0',
        javaId: 'minecraft:sand',
        bedrockId: 'minecraft:sand',
        textures: { all: 'default_sand.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'gravel',
        name: 'Gravel',
        category: 'misc',
        color: '#857b79',
        javaId: 'minecraft:gravel',
        bedrockId: 'minecraft:gravel',
        textures: { all: 'default_gravel.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'snow',
        name: 'Snow Block',
        category: 'misc',
        color: '#f0fffe',
        javaId: 'minecraft:snow_block',
        bedrockId: 'minecraft:snow',
        textures: { all: 'default_snow.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: false,
      },
      {
        id: 'ice',
        name: 'Ice',
        category: 'misc',
        color: '#9cf',
        javaId: 'minecraft:ice',
        bedrockId: 'minecraft:ice',
        textures: { all: 'default_ice.png' },
        hasBlockState: false,
        isCube: true,
        isTransparent: true,
      },
    ];

    initialBlocks.forEach((block) => {
      this.blocks.set(block.id, block);
    });
  }
}

// Export singleton instance
export const blockRegistry = BlockRegistry.getInstance();

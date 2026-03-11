import { EventEmitter } from './EventEmitter';
import type { Block } from '../types';

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
   * Initialize the registry with common Minecraft blocks
   */
  private initializeBlocks(): void {
    const initialBlocks: Block[] = [
      // Stone blocks
      { id: 'stone', name: 'Stone', category: 'stone', color: '#7f7f7f' },
      { id: 'cobblestone', name: 'Cobblestone', category: 'stone', color: '#6e6e6e' },
      { id: 'stone_bricks', name: 'Stone Bricks', category: 'stone', color: '#787878' },
      { id: 'granite', name: 'Granite', category: 'stone', color: '#9a6c5b' },
      { id: 'andesite', name: 'Andesite', category: 'stone', color: '#8c8c8c' },
      { id: 'diorite', name: 'Diorite', category: 'stone', color: '#c9c9c9' },

      // Wood blocks
      { id: 'oak_planks', name: 'Oak Planks', category: 'wood', color: '#9c7f4e' },
      { id: 'oak_log', name: 'Oak Log', category: 'wood', color: '#6f5436' },
      { id: 'spruce_planks', name: 'Spruce Planks', category: 'wood', color: '#7a5a3a' },
      { id: 'spruce_log', name: 'Spruce Log', category: 'wood', color: '#4a3728' },
      { id: 'birch_planks', name: 'Birch Planks', category: 'wood', color: '#d7cb8d' },
      { id: 'birch_log', name: 'Birch Log', category: 'wood', color: '#d9d9d9' },
      { id: 'dark_oak_planks', name: 'Dark Oak Planks', category: 'wood', color: '#3f2a15' },

      // Glass blocks
      { id: 'glass', name: 'Glass', category: 'glass', color: '#c0f4ff' },
      { id: 'white_stained_glass', name: 'White Stained Glass', category: 'glass', color: '#ffffff' },
      { id: 'red_stained_glass', name: 'Red Stained Glass', category: 'glass', color: '#993333' },
      { id: 'blue_stained_glass', name: 'Blue Stained Glass', category: 'glass', color: '#334cb2' },
      { id: 'green_stained_glass', name: 'Green Stained Glass', category: 'glass', color: '#667f33' },

      // Decoration blocks
      { id: 'brick', name: 'Bricks', category: 'decoration', color: '#9b6258' },
      { id: 'sandstone', name: 'Sandstone', category: 'decoration', color: '#e0d8a9' },
      { id: 'quartz', name: 'Quartz Block', category: 'decoration', color: '#ebe4da' },
      { id: 'gold_block', name: 'Gold Block', category: 'decoration', color: '#fcee4b' },
      { id: 'diamond_block', name: 'Diamond Block', category: 'decoration', color: '#5decf5' },
      { id: 'emerald_block', name: 'Emerald Block', category: 'decoration', color: '#3cb878' },

      // Misc blocks
      { id: 'dirt', name: 'Dirt', category: 'misc', color: '#8c6344' },
      { id: 'grass_block', name: 'Grass Block', category: 'misc', color: '#79c05a' },
      { id: 'sand', name: 'Sand', category: 'misc', color: '#dbd3a0' },
      { id: 'gravel', name: 'Gravel', category: 'misc', color: '#857b79' },
      { id: 'snow', name: 'Snow Block', category: 'misc', color: '#f0fffe' },
      { id: 'ice', name: 'Ice', category: 'misc', color: '#9cf' },
    ];

    initialBlocks.forEach((block) => {
      this.blocks.set(block.id, block);
    });
  }
}

// Export singleton instance
export const blockRegistry = BlockRegistry.getInstance();

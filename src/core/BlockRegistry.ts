import { EventEmitter } from './EventEmitter';
import type { Block, BlockStateProperties, BlockVariant } from '../types';
import { convertBlockStateFromMc } from './DirectionMapping';

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
 * - blocks:loading - When blocks start loading
 * - blocks:error - When blocks fail to load
 */
class BlockRegistry extends EventEmitter {
  private static instance: BlockRegistry;
  private blocks: Map<string, Block> = new Map();
  private loadingPromise: Promise<void> | null = null;
  private isLoaded = false;

  private constructor() {
    super();
    // Async initialization - call initializeBlocks but don't await
    this.initializeBlocks();
  }

  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  /**
   * Wait for blocks to finish loading
   * Call this before using block registry in critical paths
   */
  async waitForLoad(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    // If somehow neither flag is set, start loading
    return this.initializeBlocks();
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
   * Initialize the registry by loading canonical blocks from JSON
   */
  private async initializeBlocks(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadBlocksFromJSON();
    return this.loadingPromise;
  }

  private async loadBlocksFromJSON(): Promise<void> {
    this.emit('blocks:loading');

    try {
      // Load canonical blocks from public data directory
      const response = await fetch('/data/canonical-blocks.json');
      if (!response.ok) {
        throw new Error(`Failed to load canonical blocks: ${response.statusText}`);
      }

      const canonicalBlocks = await response.json();

      // Convert canonical blocks to Block interface
      for (const [canonicalId, canonicalBlock] of Object.entries(canonicalBlocks)) {
        const block: Block = {
          id: canonicalId,  // Use full canonical ID (minecraft:stone)
          name: (canonicalBlock as any).displayName,
          category: (canonicalBlock as any).category,
          color: (canonicalBlock as any).color,
          javaId: canonicalId,
          bedrockId: canonicalId,  // Can be converted if needed
          textures: (canonicalBlock as any).textures,
          hasBlockState: (canonicalBlock as any).hasBlockState || false,
          defaultState: (canonicalBlock as any).defaultState
            ? convertBlockStateFromMc((canonicalBlock as any).defaultState)
            : undefined,
          isCube: (canonicalBlock as any).isCube ?? true,
          isTransparent: (canonicalBlock as any).isTransparent ?? false,
          variants: (canonicalBlock as any).variants
            ? (canonicalBlock as any).variants.map((variantName: string) => ({
                textureName: variantName,
                stateProperties: {},
              }))
            : undefined,
        };

        this.blocks.set(canonicalId, block);
      }

      this.isLoaded = true;
      this.emit('blocks:loaded', this.getAllBlocks());
      console.log(`✅ Block registry loaded: ${this.blocks.size} blocks`);
    } catch (error) {
      this.emit('blocks:error', error);
      console.error('❌ Failed to load block registry:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const blockRegistry = BlockRegistry.getInstance();

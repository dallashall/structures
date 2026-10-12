import { EventEmitter } from './EventEmitter';
import type { Block, BlockStateProperties, BlockVariant } from '../types';
import { convertBlockStateFromMc } from './DirectionMapping';

const toVariant = (variantName: string): { textureName: string; stateProperties: BlockStateProperties } => ({
  textureName: variantName,
  stateProperties: {},
});

/**
 * BlockRegistry - The block catalog from public/data/canonical-blocks.json (npm run merge:fragments writes it).
 * Block states convert from Minecraft's facing names to the app's axis names on load.
 *
 * Events:
 * - blocks:registered - When blocks are loaded into the registry
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
    this.initializeBlocks();
  }

  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  async waitForLoad(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    return this.initializeBlocks();
  }

  getBlock(blockId: string): Block | null {
    return this.blocks.get(blockId) || null;
  }

  getAllBlocks(): Block[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Blocks a user can pick: every block except face and state textures of other blocks
   */
  getPickableBlocks(): Block[] {
    const isPickable = (block: Block): boolean => !block.hidden;
    return this.getAllBlocks().filter(isPickable);
  }

  getBlocksByCategory(category: string): Block[] {
    const isInCategory = (block: Block): boolean => block.category.toLowerCase() === category.toLowerCase();
    return this.getAllBlocks().filter(isInCategory);
  }

  // A case-insensitive substring match on the display name. An empty query returns every block.
  searchBlocks(query: string): Block[] {
    if (!query || query.trim().length === 0) {
      return this.getAllBlocks();
    }

    const lowerQuery = query.toLowerCase();
    const matchesQuery = (block: Block): boolean => block.name.toLowerCase().includes(lowerQuery);
    return this.getAllBlocks().filter(matchesQuery);
  }

  registerBlock(block: Block): void {
    this.blocks.set(block.id, block);
    this.emit('blocks:registered', this.getAllBlocks());
  }

  /**
   * The variant is the first whose properties all appear in `state` with the same values
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

    const matchesRequestedState = (variant: BlockVariant): boolean =>
      this.matchesState(variant.stateProperties, state);
    const variant = block.variants.find(matchesRequestedState);

    return { block, variant };
  }

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
      const response = await fetch('/data/canonical-blocks.json');
      if (!response.ok) {
        throw new Error(`Failed to load canonical blocks: ${response.statusText}`);
      }

      const canonicalBlocks = await response.json();

      for (const [canonicalId, canonicalBlock] of Object.entries(canonicalBlocks)) {
        const block: Block = {
          id: canonicalId,
          name: (canonicalBlock as any).displayName,
          category: (canonicalBlock as any).category,
          color: (canonicalBlock as any).color,
          javaId: canonicalId,
          bedrockId: canonicalId,
          textures: (canonicalBlock as any).textures,
          hasBlockState: (canonicalBlock as any).hasBlockState || false,
          defaultState: (canonicalBlock as any).defaultState
            ? convertBlockStateFromMc((canonicalBlock as any).defaultState)
            : undefined,
          isCube: (canonicalBlock as any).isCube ?? true,
          isTransparent: (canonicalBlock as any).isTransparent ?? false,
          hidden: (canonicalBlock as any).hidden ?? false,
          variants: (canonicalBlock as any).variants
            ? (canonicalBlock as any).variants.map(toVariant)
            : undefined,
        };

        this.blocks.set(canonicalId, block);
      }

      this.isLoaded = true;
      this.emit('blocks:registered', this.getAllBlocks());
      console.log(`Block registry loaded: ${this.blocks.size} blocks`);
    } catch (error) {
      this.emit('blocks:error', error);
      console.error('Failed to load block registry:', error);
      throw error;
    }
  }
}

export const blockRegistry = BlockRegistry.getInstance();
